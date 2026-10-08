/*
 * sni-bridge.js — in-page replacement for SNI / QUsb2Snes.
 *
 * Exposes window.AlttpBridge, which answers usb2snes-style memory reads
 * straight from the built-in EmulatorJS instance (snes9x core).
 *
 * usb2snes / SD2SNES address space:
 *   0x000000-0xDFFFFF  ROM   (file offset, copier header stripped)
 *   0xE00000-0xEFFFFF  SRAM  (cartridge save RAM)
 *   0xF50000-0xF6FFFF  WRAM  (the SNES's 128 KB work RAM, $7E0000-$7FFFFF)
 *
 * How WRAM is found: EmulatorJS doesn't export the core's memory pointer, but
 * gameManager.getState() returns a snes9x snapshot, which stores work RAM in
 * a tagged block "RAM:131072:<bytes>". We take one snapshot, then search the
 * WASM heap for that exact 128 KB block. After that every read is a direct
 * view into live emulator memory — no copying, no serialization.
 * If the heap search ever fails, reads fall back to (throttled) snapshots.
 */
(function () {
  'use strict';

  const WRAM_SIZE = 0x20000;
  const WRAM_BASE = 0xF50000;
  const SRAM_BASE = 0xE00000;
  const RAM_TAG = 'RAM:131072:';
  const SRAM_TAG = 'SRA:';
  const SNAPSHOT_MIN_MS = 200;     // throttle for fallback mode
  const VERIFY_EVERY_MS = 5000;    // re-check the live pointer this often

  const state = {
    rom: null,            // Uint8Array, header stripped
    romName: '',
    ptr: -1,              // byte offset of WRAM inside Module.HEAPU8
    mode: 'idle',         // idle | live | snapshot
    snapRam: null,        // fallback copy of WRAM
    snapSram: null,
    snapAt: 0,
    lastVerify: 0,
    listeners: new Set(),
  };

  function emu() { return window.EJS_emulator || null; }
  function gm() { const e = emu(); return e && e.gameManager ? e.gameManager : null; }
  function heap() {
    const g = gm();
    return g && g.Module && g.Module.HEAPU8 ? g.Module.HEAPU8 : null;
  }

  function emit() {
    const s = status();
    state.listeners.forEach(fn => { try { fn(s); } catch (e) {} });
  }

  function status() {
    return {
      romLoaded: !!state.rom,
      running: !!gm(),
      mode: state.mode,
      ptr: state.ptr,
      romName: state.romName,
    };
  }

  // ── snapshot parsing ──────────────────────────────────────────────────────
  function indexOfAscii(buf, str, from) {
    const first = str.charCodeAt(0);
    const n = str.length;
    outer:
    for (let i = from || 0; i <= buf.length - n; i++) {
      if (buf[i] !== first) continue;
      for (let j = 1; j < n; j++) if (buf[i + j] !== str.charCodeAt(j)) continue outer;
      return i;
    }
    return -1;
  }

  function takeSnapshot() {
    const g = gm();
    if (!g) return null;
    let st;
    try { st = g.getState(); } catch (e) { return null; }
    if (!st) return null;
    const buf = st instanceof Uint8Array ? st : new Uint8Array(st.buffer || st);
    const at = indexOfAscii(buf, RAM_TAG, 0);
    if (at < 0 || at + RAM_TAG.length + WRAM_SIZE > buf.length) return null;
    const ram = buf.slice(at + RAM_TAG.length, at + RAM_TAG.length + WRAM_SIZE);

    // SRAM block: "SRA:NNNNNN:" (length varies by cart)
    let sram = null;
    const sAt = indexOfAscii(buf, SRAM_TAG, 0);
    if (sAt >= 0) {
      const len = parseInt(String.fromCharCode.apply(null, buf.subarray(sAt + 4, sAt + 10)), 10);
      if (len > 0 && buf[sAt + 10] === 0x3A) sram = buf.slice(sAt + 11, sAt + 11 + len);
    }
    return { ram, sram };
  }

  // ── locating WRAM in the WASM heap ────────────────────────────────────────
  function pickNeedle(ram) {
    // Find a 64-byte window with plenty of distinct values, so the search
    // doesn't lock onto zero-filled regions.
    for (let off = 0; off + 64 <= WRAM_SIZE; off += 256) {
      const seen = new Set();
      for (let k = 0; k < 64; k++) seen.add(ram[off + k]);
      if (seen.size >= 20) return off;
    }
    return 0;
  }

  function locateWram() {
    const snap = takeSnapshot();
    const h = heap();
    if (!snap || !h) return false;
    const ram = snap.ram;
    const nOff = pickNeedle(ram);
    const b0 = ram[nOff];
    const hits = [];
    for (let i = nOff; i <= h.length - (WRAM_SIZE - nOff); i++) {
      if (h[i] !== b0) continue;
      let ok = true;
      for (let k = 1; k < 64; k++) if (h[i + k] !== ram[nOff + k]) { ok = false; break; }
      if (!ok) continue;
      const base = i - nOff;
      // Skip copies that are just the serialized snapshot buffer itself.
      if (base >= RAM_TAG.length) {
        let tagged = true;
        for (let t = 0; t < RAM_TAG.length; t++)
          if (h[base - RAM_TAG.length + t] !== RAM_TAG.charCodeAt(t)) { tagged = false; break; }
        if (tagged) continue;
      }
      // Full verification.
      let full = true;
      for (let k = 0; k < WRAM_SIZE; k += 1) if (h[base + k] !== ram[k]) { full = false; break; }
      if (full) hits.push(base);
      if (hits.length > 4) break;
    }
    state.snapRam = ram; state.snapSram = snap.sram; state.snapAt = performance.now();
    if (hits.length >= 1) {
      // If more than one identical block exists, the first one wins; the
      // periodic verify below will move us if it goes stale.
      state.ptr = hits[0];
      state.mode = 'live';
      state.lastVerify = performance.now();
      console.log('[bridge] WRAM located in WASM heap at', '0x' + state.ptr.toString(16),
                  hits.length > 1 ? '(' + hits.length + ' candidates)' : '');
    } else {
      state.ptr = -1;
      state.mode = 'snapshot';
      console.warn('[bridge] WRAM not found in heap — using snapshot fallback');
    }
    emit();
    return true;
  }

  function verifyLive() {
    const now = performance.now();
    if (now - state.lastVerify < VERIFY_EVERY_MS) return;
    state.lastVerify = now;
    const snap = takeSnapshot();
    const h = heap();
    if (!snap || !h) return;
    // Snapshot and live memory are read in the same JS tick, so they must
    // match exactly. Spot-check 32 spread-out ranges.
    for (let k = 0; k < WRAM_SIZE; k += 4096) {
      if (h[state.ptr + k] !== snap.ram[k] || h[state.ptr + k + 7] !== snap.ram[k + 7]) {
        console.warn('[bridge] live WRAM pointer went stale, relocating');
        locateWram();
        return;
      }
    }
    state.snapSram = snap.sram;
  }

  function wramView() {
    if (!gm()) return null;
    if (state.mode === 'idle') { if (!locateWram()) return null; }
    if (state.mode === 'live') {
      verifyLive();
      const h = heap();
      if (state.mode === 'live' && h) return h.subarray(state.ptr, state.ptr + WRAM_SIZE);
    }
    // snapshot fallback
    const now = performance.now();
    if (now - state.snapAt > SNAPSHOT_MIN_MS) {
      const s = takeSnapshot();
      if (s) { state.snapRam = s.ram; state.snapSram = s.sram; state.snapAt = now; }
      if (state.mode === 'snapshot' && now - state.lastVerify > VERIFY_EVERY_MS) {
        state.lastVerify = now; locateWram();  // try to upgrade to live
      }
    }
    return state.snapRam;
  }

  // ── public read API (usb2snes semantics) ──────────────────────────────────
  function read(addr, len) {
    const out = new Uint8Array(len);
    if (addr >= WRAM_BASE && addr < WRAM_BASE + WRAM_SIZE) {
      const w = wramView();
      if (!w) return out;
      const off = addr - WRAM_BASE;
      out.set(w.subarray(off, Math.min(off + len, WRAM_SIZE)));
    } else if (addr >= SRAM_BASE && addr < 0xF00000) {
      wramView(); // refreshes snapSram as a side effect
      const s = state.snapSram;
      if (s) { const off = addr - SRAM_BASE; out.set(s.subarray(off, Math.min(off + len, s.length))); }
    } else if (addr < SRAM_BASE && state.rom) {
      out.set(state.rom.subarray(addr, Math.min(addr + len, state.rom.length)));
    }
    return out;
  }

  // Ready = a game is running and WRAM is readable.
  function ready() { return !!gm() && !!state.rom; }

  function setRom(bytes, name) {
    let rom = bytes;
    if (rom.length % 1024 === 512) rom = rom.subarray(512); // copier header
    state.rom = rom;
    state.romName = name || '';
    state.mode = 'idle'; state.ptr = -1; state.snapRam = null; state.snapSram = null;
    emit();
  }

  // Called when the emulator restarts / loads a state: force a re-locate.
  function invalidate() { if (state.mode !== 'idle') { state.mode = 'idle'; state.ptr = -1; emit(); } }

  window.AlttpBridge = {
    read, ready, setRom, invalidate, status,
    deviceName: 'EmulatorJS (built-in)',
    onStatus(fn) { state.listeners.add(fn); return () => state.listeners.delete(fn); },
    // Debug helper: AlttpBridge.peek(0x7EF340, 16)
    peek(snesAddr, len) {
      const a = (snesAddr >= 0x7E0000 && snesAddr < 0x800000) ? WRAM_BASE + (snesAddr - 0x7E0000) : snesAddr;
      return Array.from(read(a, len || 16), b => b.toString(16).padStart(2, '0')).join(' ');
    },
  };
})();
