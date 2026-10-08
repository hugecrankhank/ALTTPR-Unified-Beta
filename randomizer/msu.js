// MSU-1 music packs, played next to the emulator.
//
// The emulator core has no MSU-1 chip, so the game always plays its own
// (SPC) music. When a pack is loaded we build the ROM with the randomizer's
// "no background music" flag (0x18021A) so the SPC stays silent but sound
// effects keep playing, then follow the song the game asks for in WRAM and
// play the matching PCM track here. Track choice mirrors z3randomizer's
// msu.asm (dungeon/boss-specific tracks, light/dark world variants,
// fallbacks for packs without the extended tracks, overworld resume).

const WRAM = 0xF50000;            // AlttpBridge address of $7E0000
const NO_BGM = 0x18021A;          // ROM flag: 1 = SPC music off
const RATE = 44100;

// msu.asm MSUTrackList: 1 = play once, 3 = loop
const PLAY_ONCE = new Set([1, 8, 10, 19, 25, 26, 29, 33, 34]);
// msu.asm MSUExtendedFallbackList (track -> track to use when missing)
const FALLBACK = [0,
  0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0A, 0x0B, 0x0C, 0x0D, 0x0E, 0x0D, 0x10,
  0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17, 0x18, 0x19, 0x1A, 0x1B, 0x1C, 0x1D, 0x1E, 0x1F, 0x20,
  0x21, 0x22, 0x11, 0x11, 0x10, 0x16, 0x16, 0x16, 0x16, 0x16, 0x11, 0x16, 0x16, 0x16, 0x15, 0x15,
  0x15, 0x15, 0x15, 0x15, 0x15, 0x15, 0x15, 0x15, 0x15, 0x15, 0x16, 0x02, 0x09];
const OVERWORLD = new Set([2, 3, 4, 5, 7, 9, 15, 60, 61]);
const RESUME_MS = 30000;          // msu.asm MSUResumeTimer: 1800 frames

export function trackNumber(fileName) {
  const m = /-(\d+)\.pcm$/i.exec(fileName);
  return m ? Number(m[1]) : null;
}

export class MsuPlayer {
  constructor() {
    this.tracks = new Map();      // track number -> Blob
    this.ctx = null;
    this.gain = null;
    this.source = null;
    this.playing = 0;             // MSU track currently playing
    this.lastCmd = 0;             // last value seen at $7E0130
    this.target = 1;              // volume the game asked for (F2/F3)
    this.level = 1;               // current fade level
    this.resume = null;           // { track, offset, at }
    this.startedAt = 0;
    this.buffers = new Map();     // small cache of decoded tracks
    this.loadToken = 0;
    this.lastFrame = -1;
    this.lastFrameAt = 0;
    this.timer = null;
  }

  setTracks(map) { this.tracks = map; this.buffers.clear(); this.stop(); }
  get count() { return this.tracks.size; }

  // Must be called from a tap/click so iOS lets audio start.
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.gain = this.ctx.createGain();
      this.gain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
  }

  start() {
    if (this.timer) return;
    this.timer = setInterval(() => this.tick(), 50);
  }

  stop() {
    this.stopSource();
    this.playing = 0;
    this.lastCmd = 0;
    this.resume = null;
  }

  stopSource() {
    if (this.source) {
      try { this.source.onended = null; this.source.stop(); } catch (e) {}
      this.source.disconnect();
      this.source = null;
    }
  }

  active() {
    const b = window.AlttpBridge;
    if (!this.tracks.size || !b || !b.ready()) return false;
    const st = b.status();
    if (!st.running || (st.mode !== 'live' && st.mode !== 'snapshot')) return false;
    // only when the running ROM is a randomizer ROM with its own music off
    const title = b.read(0x7FC0, 2);
    return title[0] === 0x56 && title[1] === 0x54 && b.read(NO_BGM, 1)[0] === 1;   // "VT"
  }

  ram(addr, len = 1) { return window.AlttpBridge.read(WRAM + addr, len); }

  tick() {
    if (!this.active()) {
      if (this.playing) this.stop();
      return;
    }
    const now = performance.now();

    // pause with the game (menu open, emulator paused, tab hidden)
    const frame = this.ram(0x1A)[0];
    if (frame !== this.lastFrame) { this.lastFrame = frame; this.lastFrameAt = now; }
    const paused = now - this.lastFrameAt > 200;
    if (this.ctx) {
      if (paused && this.ctx.state === 'running') this.ctx.suspend().catch(() => {});
      if (!paused && this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    }
    if (paused) return;

    const cmd = this.ram(0x130)[0];       // LastAPUCommand: last song / F1 fade
    const vol = this.ram(0x133)[0];       // CurrentControlRequest: catches F2/F3
    if (vol === 0xF2) this.target = 0.5;
    else if (vol === 0xF3) this.target = 1;

    if (cmd !== this.lastCmd) {
      const prev = this.lastCmd;
      this.lastCmd = cmd;
      if (cmd === 0xF1) {
        this.target = 0;
        this.fadingOut = true;
      } else if (cmd >= 1 && cmd <= 0x3F && (cmd !== prev || !this.playing)) {
        this.target = vol === 0xF2 ? 0.5 : 1;
        this.fadingOut = false;
        this.request(cmd);
      }
    }
    this.applyVolume(now);
  }

  // msu.asm CheckMusicLoadRequest: pick the extended track for this request
  pickTrack(req) {
    const r = (a, n = 1) => this.ram(a, n);
    const dungeonId = r(0x40C)[0];
    const crystals = r(0xF37A)[0];
    let t = req;
    switch (req) {
      case 2: if (r(0xF280 + 0x80)[0] & 0x40) t = 60; break;           // after the pedestal
      case 9: if (crystals === 0x7F) t = 61; break;                     // all crystals
      case 13:
      case 15:
        if (crystals === 0x7F) t = 61;
        else if (r(0xF3CA)[0] !== 0 && r(0x8A)[0] === 0x40) t = 15;
        break;
      case 16: if (dungeonId === 0x08) t = (dungeonId >> 1) + 33; break; // Agahnim's Tower
      case 17:
      case 22: t = (dungeonId >> 1) + 33; break;                        // dungeon themes
      case 21: t = (dungeonId >> 1) + 45; break;                        // boss themes
    }
    // Kakariko theme inside Link's house plays nothing
    if (t === 7 && r(0x10)[0] === 0x07) return 0;
    // fall back to the base track when the pack doesn't have the extended one
    const chain = [t];
    if (t >= 35 && t <= 46) chain.push(req);      // dungeon theme -> that dungeon's normal music
    if (t >= 47 && t <= 58) chain.push(21);       // boss theme -> normal boss music
    let x = chain[chain.length - 1];
    for (let g = 0; g < 8 && FALLBACK[x] && FALLBACK[x] !== x; g++) { x = FALLBACK[x]; chain.push(x); }
    chain.push(req);
    return chain.find((c) => this.tracks.has(c)) || 0;
  }

  async request(req) {
    const t = this.pickTrack(req);
    if (t === this.playing && this.source) return;
    // remember where an overworld song was, for a quick return
    if (this.playing && OVERWORLD.has(this.playing) && this.source && this.ctx) {
      this.resume = { track: this.playing, offset: this.position(), at: performance.now() };
    }
    this.stopSource();
    this.playing = t;
    if (!t) return;
    const token = ++this.loadToken;
    let buf;
    try { buf = await this.decode(t); } catch (e) { console.warn('[msu] track', t, e); return; }
    if (token !== this.loadToken || !this.ctx) return;

    const src = this.ctx.createBufferSource();
    src.buffer = buf.audio;
    if (!PLAY_ONCE.has(t)) {
      src.loop = true;
      src.loopStart = Math.min(buf.loop / RATE, buf.audio.duration);
      src.loopEnd = buf.audio.duration;
    }
    src.connect(this.gain);
    let offset = 0;
    if (this.resume && this.resume.track === t && performance.now() - this.resume.at < RESUME_MS) {
      offset = this.resume.offset;
      this.level = 0;            // fade back in
    } else {
      this.level = this.target;
    }
    this.resume = null;
    src.onended = () => { if (this.source === src) { this.source = null; } };
    this.source = src;
    this.startedAt = this.ctx.currentTime - offset;
    this.loopInfo = { loop: buf.loop / RATE, dur: buf.audio.duration, once: PLAY_ONCE.has(t) };
    src.start(0, offset);
  }

  position() {
    const p = this.ctx.currentTime - this.startedAt;
    const { loop, dur, once } = this.loopInfo || { loop: 0, dur: 0, once: true };
    if (once || p < dur) return Math.max(0, p);
    return loop + ((p - loop) % Math.max(0.001, dur - loop));
  }

  applyVolume(now) {
    if (!this.gain || !this.ctx) return;
    const dt = Math.min(0.2, (now - (this.lastVolAt || now)) / 1000);
    this.lastVolAt = now;
    // msu.asm fades: down 2/255 per frame, up 16/255 per frame
    if (this.level > this.target) {
      this.level = Math.max(this.target, this.level - dt * 60 * 2 / 255);
      if (this.level === 0 && this.fadingOut) { this.stopSource(); this.playing = 0; }
    } else if (this.level < this.target) {
      this.level = Math.min(this.target, this.level + dt * 60 * 16 / 255);
    }
    const ejs = window.EJS_emulator;
    const master = ejs ? (ejs.muted ? 0 : (typeof ejs.volume === 'number' ? ejs.volume : 0.5)) : 0.5;
    this.gain.gain.setTargetAtTime(this.level * master, this.ctx.currentTime, 0.02);
  }

  async decode(t) {
    if (this.buffers.has(t)) return this.buffers.get(t);
    const bytes = new Uint8Array(await this.tracks.get(t).arrayBuffer());
    if (bytes.length < 8 || String.fromCharCode(...bytes.subarray(0, 4)) !== 'MSU1') {
      throw new Error('not an MSU-1 .pcm file');
    }
    const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const loop = dv.getUint32(4, true);
    const frames = Math.floor((bytes.length - 8) / 4);
    const audio = this.ctx.createBuffer(2, Math.max(1, frames), RATE);
    const L = audio.getChannelData(0), R = audio.getChannelData(1);
    for (let i = 0, o = 8; i < frames; i++, o += 4) {
      L[i] = dv.getInt16(o, true) / 32768;
      R[i] = dv.getInt16(o + 2, true) / 32768;
    }
    const entry = { audio, loop: loop < frames ? loop : 0 };
    // keep only a couple of decoded songs (they're large)
    if (this.buffers.size >= 2) this.buffers.delete(this.buffers.keys().next().value);
    this.buffers.set(t, entry);
    return entry;
  }
}
