// Randomizer bar: settings dropdowns -> seed generation (in a worker) ->
// patch the player's own Japanese 1.0 ROM in the browser -> boot it.
import { md5 } from './md5.js';
import { parseSprite, applySprite, drawHead, drawSheet } from './sprite.js';
import { MsuPlayer, trackNumber } from './msu.js';
import { buildLink, readLink, clearLink, codeForSeed, codeFromRom, codeNames, renderCode, PARAMS } from './share.js';
import { openLibrary, fetchSprite, labelOf, isPlainLink } from './library.js';
import { relayUrl, ownRelay, setRelayUrl, DEFAULT_RELAY, alttprId, fetchAlttprSeed, baseFor, patchSeed } from './remote.js';
import * as Kara from './kara/index.js';
import { buildUi as buildKaraUi } from './kara/ui.js';

const msu = new MsuPlayer();

const JP10_MD5 = '03a63945398191337e896e5771f77173';   // ALttP (Japan) v1.0, headerless
const BASE_MD5 = 'edc01f3db798ae4dfe21101311598d44';   // after the 2024-02-18 base patch (alttpr.com build)
const ROM_SIZE = 0x200000;
const $ = (id) => document.getElementById(id);

// ── tiny IndexedDB key/value store (ROMs never leave the device) ──────────────
function idb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('alttpr-unified-kara', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('kv');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function kvGet(key) {
  const db = await idb();
  return new Promise((resolve, reject) => {
    const r = db.transaction('kv').objectStore('kv').get(key);
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
async function kvSet(key, val) {
  const db = await idb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('kv', 'readwrite');
    tx.objectStore('kv').put(val, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
async function kvDel(key) {
  const db = await idb();
  return new Promise((resolve) => {
    const tx = db.transaction('kv', 'readwrite');
    tx.objectStore('kv').delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
}
export { kvGet, kvSet, kvDel };

// ── settings ─────────────────────────────────────────────────────────────────
const FIELDS = ['r-gen', 'r-mode', 'r-goal', 'r-tower', 'r-ganon', 'r-weapons', 'r-placement', 'r-dungeon', 'r-access',
  'r-pool', 'r-func', 'r-hints', 'r-heartbeep', 'r-quickswap', 'r-menuspeed'];

function readSettings() {
  return {
    mode: $('r-mode').value,
    goal: $('r-goal').value,
    crystals: { tower: $('r-tower').value, ganon: $('r-ganon').value },
    weapons: $('r-weapons').value,
    item_placement: $('r-placement').value,
    dungeon_items: $('r-dungeon').value,
    accessibility: $('r-access').value,
    item: { pool: $('r-pool').value, functionality: $('r-func').value },
    hints: $('r-hints').value,
  };
}

function saveFields() {
  const o = {};
  FIELDS.forEach((id) => { if ($(id)) o[id] = $(id).value; });
  try { localStorage.setItem('unified-kara-fields', JSON.stringify(o)); } catch (e) {}
}

function loadFields() {
  let o = {};
  try { o = JSON.parse(localStorage.getItem('unified-kara-fields') || '{}'); } catch (e) {}
  FIELDS.forEach((id) => {
    const el = $(id);
    if (el && o[id] != null && [...el.options].some((op) => op.value === o[id])) el.value = o[id];
  });
}

// ── base ROM ─────────────────────────────────────────────────────────────────
function stripHeader(bytes) {
  return bytes.length % 1024 === 512 ? bytes.subarray(512) : bytes;
}

async function setBaseRom(file) {
  let bytes = stripHeader(new Uint8Array(await file.arrayBuffer()));
  if (bytes.length > 0x100000) bytes = bytes.subarray(0, 0x100000);
  const sum = md5(bytes);
  if (sum !== JP10_MD5) {
    throw new Error('That file isn\'t a Japanese 1.0 "Zelda no Densetsu: Kamigami no Triforce" ROM '
      + '(the one alttpr.com uses). MD5 ' + sum);
  }
  await kvSet('base-jp10', bytes.slice());
  return true;
}

let basePatchCache = null;
async function loadBasePatch() {
  if (basePatchCache) return basePatchCache;
  const res = await fetch(new URL('data/base-patch.bin', import.meta.url));
  if (!res.ok) throw new Error('Could not load the base patch (' + res.status + ')');
  basePatchCache = new Uint8Array(await res.arrayBuffer());
  return basePatchCache;
}

async function buildBaseRom() {
  const jp = await kvGet('base-jp10');
  if (!jp) throw new Error('Choose your Japanese 1.0 ROM first (Base ROM button).');
  const rom = new Uint8Array(ROM_SIZE);
  rom.set(jp.subarray(0, 0x100000));
  const p = await loadBasePatch();
  const dv = new DataView(p.buffer, p.byteOffset, p.byteLength);
  if (String.fromCharCode(p[0], p[1], p[2], p[3]) !== 'Z3BP') throw new Error('Corrupt base patch file');
  const n = dv.getUint32(4, true);
  let o = 8;
  for (let i = 0; i < n; i++) {
    const off = dv.getUint32(o, true), len = dv.getUint32(o + 4, true);
    o += 8;
    rom.set(p.subarray(o, o + len), off);
    o += len;
  }
  // Should match alttpr.com's own base ROM exactly. If it ever doesn't, still
  // play (the seed data is the same) but say so.
  const sum = md5(rom);
  if (sum !== BASE_MD5) console.warn('[randomizer] base ROM MD5 ' + sum + ' differs from alttpr.com build ' + BASE_MD5);
  return { rom, baseOk: sum === BASE_MD5 };
}

// menuSpeed: false for Kara's branch, whose site doesn't offer it (she asked
// that nothing beyond her own site's options be written to her seeds)
function applyCosmetics(rom, { quickswap = true, menuSpeed = true } = {}) {
  const w = (off, ...b) => b.forEach((v, i) => { rom[off + i] = v; });
  const beep = { off: 0x00, half: 0x40, quarter: 0x80, double: 0x10, normal: 0x20 }[$('r-heartbeep').value] ?? 0x40;
  w(0x180033, beep);
  w(0x18004B, quickswap && $('r-quickswap').value === 'on' ? 0x01 : 0x00);
  if (menuSpeed) {
    const ms = $('r-menuspeed').value;
    w(0x180048, { instant: 0xE8, fast: 0x10, normal: 0x08, slow: 0x04 }[ms] ?? 0x08);
    const fast = ms === 'instant';
    w(0x6DD9A, fast ? 0x20 : 0x11);
    w(0x6DF2A, fast ? 0x20 : 0x12);
    w(0x6E0E9, fast ? 0x20 : 0x12);
  }
  w(0x18021A, 0x00);   // music on
  w(0x18017F, 0x00);   // reduce flashing off
}

function updateChecksum(rom) {
  let sum = 0;
  for (let i = 0; i < rom.length; i++) if (i < 0x7FDC || i >= 0x7FE0) sum += rom[i];
  const checksum = (sum + 0x1FE) & 0xFFFF;
  const inverse = checksum ^ 0xFFFF;
  rom[0x7FDC] = inverse & 0xFF; rom[0x7FDD] = inverse >> 8;
  rom[0x7FDE] = checksum & 0xFF; rom[0x7FDF] = checksum >> 8;
}

// ── generation in a worker ────────────────────────────────────────────────────
let worker = null, reqId = 0;
const pending = new Map();
function getWorker() {
  if (!worker) {
    worker = new Worker(new URL('worker.js', import.meta.url), { type: 'module' });
    worker.onmessage = (e) => {
      const p = pending.get(e.data.id);
      if (!p) return;
      pending.delete(e.data.id);
      e.data.ok ? p.resolve(e.data.result) : p.reject(new Error(e.data.error));
    };
    worker.onerror = (e) => {
      for (const p of pending.values()) p.reject(new Error(e.message || 'Generator failed to load'));
      pending.clear();
      worker = null;
    };
  }
  return worker;
}
function runGenerator(settings, seed) {
  return new Promise((resolve, reject) => {
    const id = ++reqId;
    pending.set(id, { resolve, reject });
    getWorker().postMessage({ id, settings, seed, stamp: true });
  });
}

function randomSeed() {
  const a = new Uint32Array(1);
  crypto.getRandomValues(a);
  return a[0] >>> 0;
}

function parseSeed(text) {
  text = String(text || '').trim();
  if (!text) return null;
  if (/^\d+$/.test(text)) return Number(BigInt(text) % 4294967296n);
  // any other text: hash it into a seed so "words" work too
  let h = 2166136261;
  for (const c of new TextEncoder().encode(text)) { h ^= c; h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}

// ── UI ───────────────────────────────────────────────────────────────────────
let last = null;   // { rom, name, spoiler }

function status(msg, kind = '') {
  const el = $('r-status');
  el.textContent = msg;
  el.className = kind;
}

async function refreshBaseStatus() {
  const has = !!(await kvGet('base-jp10').catch(() => null));
  $('r-base-label').textContent = has ? 'Base ROM ✓' : 'Base ROM…';
  $('r-base-label').classList.toggle('ok', has);
  $('r-base-label').title = has
    ? 'Your Japanese 1.0 ROM is saved in this browser. Click to replace it.'
    : 'Choose your Japanese 1.0 ALttP ROM (stays on this device)';
  return has;
}

function download(bytes, name, type) {
  const url = URL.createObjectURL(new Blob([bytes], { type }));
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

// Which ROM is in the emulator; the share buttons are for a generated seed
// only, and only while it's the one being played.
let playing = null;   // { name, code }

function showLast() {
  const live = !!last && (!playing || playing.name === last.name);
  $('r-download').hidden = !last;
  // a race seed keeps its spoiler hidden
  $('r-spoiler').hidden = !last || !!last.race;
  if (last && last.alttpr) {
    $('r-seed-out').textContent = `alttpr.com seed ${last.alttpr}`;
    $('r-seed-out').title = 'Paste this id, or its alttpr.com link, to load the same seed again';
  } else if (last && last.gwaa) {
    $('r-seed-out').textContent = `Kara ${last.race ? 'race seed' : 'seed'} ${last.gwaa}`;
    $('r-seed-out').title = 'A seed from Kara\'s server: its link opens on her site, and pasting it here loads it again';
  } else if (last && last.kara) {
    $('r-seed-out').textContent = `Kara ${last.race ? 'race seed' : 'seed'} ${last.spoiler.seed}`;
    $('r-seed-out').title = last.race ? 'A race seed: its spoiler stays hidden'
      : 'Kara\'s branch: this number with the same settings gives the same game again';
  } else {
    $('r-seed-out').textContent = last ? (last.race ? `Race seed ${last.spoiler.seed}` : `Seed ${last.spoiler.seed}`) : '';
    $('r-seed-out').title = last && last.race ? 'A race seed: its spoiler stays hidden'
      : 'Type this number in the seed box to get the same game again';
  }
  const canShare = live && (!!last.fields || !!last.alttpr || !!last.kara || !!last.gwaa);
  $('r-share').hidden = !canShare;
  $('r-share-race').hidden = !canShare || !!last.alttpr || !!last.gwaa;   // their link is the link   // an alttpr.com seed's link is the link
  const code = playing ? playing.code : (last ? (last.code || (last.alttpr ? null : codeForSeed(last.spoiler.seed))) : null);
  renderCode($('r-code'), code);
}

// Called by the main page whenever a ROM starts, generated or loaded.
function noteRom(bytes, name) {
  const off = bytes.length % 1024 === 512 ? 512 : 0;
  playing = { name, code: codeFromRom(bytes.subarray(off)) };
  showLast();
}

async function copyLink(race) {
  if (!last || (!last.fields && !last.alttpr && !last.kara)) return;
  const url = last.alttpr ? `https://alttpr.com/h/${last.alttpr}`
    : last.gwaa ? Kara.siteLink(last.gwaa)
    : last.kara ? Kara.buildLink(last.spoiler.seed, last.kara, race)
      : buildLink(last.spoiler.seed, last.fields, race);
  const what = last.alttpr ? 'alttpr.com link' : last.gwaa ? 'Kara seed link' : race ? 'Race link' : 'Seed link';
  try {
    await navigator.clipboard.writeText(url);
    status(`${what} copied. Anyone who opens it gets the same game (they need their own base ROM).` +
      (race ? ' The spoiler is hidden for them.' : ''), 'ok');
  } catch (e) {
    window.prompt(`${what}: copy it from here`, url);
  }
}

// ── a seed link someone shared ────────────────────────────────────────────────
let shared = null;   // { seed, fields, race } while the link's seed is waiting to be played

function settingsMatch(fields) {
  return Object.keys(PARAMS).every((k) => { const id = PARAMS[k]; return !(id in fields) || $(id).value === fields[id]; });
}
function currentFields() {
  const o = {};
  Object.values(PARAMS).forEach((id) => { o[id] = $(id).value; });
  return o;
}

function showShared() {
  const box = $('r-shared');
  if (!shared) { box.hidden = true; return; }
  const parts = shared.kara ? ['Kara\'s branch', ...Kara.describe(shared.kara)] : Object.values(PARAMS).map((id) => {
    const el = $(id); return el && el.selectedOptions[0] ? el.selectedOptions[0].textContent : '';
  }).filter(Boolean);
  box.hidden = false;
  box.innerHTML = '';
  const b = document.createElement('b');
  b.textContent = shared.race ? `Race seed ${shared.seed}` : `Shared seed ${shared.seed}`;
  const p = document.createElement('span');
  p.textContent = ' · ' + parts.join(' · ');
  const go = document.createElement('button');
  go.type = 'button'; go.className = 'primary'; go.textContent = 'Play this seed';
  go.addEventListener('click', generateAndPlay);
  const x = document.createElement('button');
  x.type = 'button'; x.textContent = 'Dismiss';
  x.addEventListener('click', () => {
    if (shared && shared.kara && karaUi) { karaUi.hold(false); karaUi.set(karaSaved || Kara.presetSettings('default'), { persist: false }); }
    shared = null; clearLink(); showShared(); $('r-seed').value = '';
  });
  box.append(b, p, go, x);
  const notes = [];
  if (shared.race) notes.push('Race: the spoiler stays hidden. Check that everyone sees the same five-item code on the file select screen.');
  if (shared.otherBuild) notes.push('This link was made with a different version of the generator, so the game may not match the other players\' — compare the five-item code.');
  if (shared.problems.length) notes.push(`Some settings in the link weren't recognised (${shared.problems.join(', ')}).`);
  if (notes.length) {
    const n = document.createElement('div');
    n.className = 'note'; n.textContent = notes.join(' ');
    box.appendChild(n);
  }
}

// a Kara-branch link: switch to her generator with the link's settings
let karaSaved = null;   // the player's own Kara settings while a link's are showing
function takeKaraLink(l) {
  setGen('kara');
  if (!(shared && shared.kara)) karaSaved = karaUi.get();
  karaUi.hold(true);
  karaUi.set(l.settings, { persist: false });
  $('r-seed').value = String(l.seed);
  shared = { kara: karaUi.get(), seed: l.seed, race: l.race, otherBuild: l.otherBuild, problems: l.problems };
  document.body.classList.add('rando-open');
  $('r-toggle').setAttribute('aria-expanded', 'true');
  showShared();
}

function takeSharedLink() {
  const k = Kara.readLink(location.search);
  if (k) { takeKaraLink(k); return; }
  const l = readLink(location.search, $);
  if (!l) return;
  setGen('alttpr');
  Object.entries(l.fields).forEach(([id, v]) => { $(id).value = v; });
  $('r-seed').value = String(l.seed);
  shared = { seed: l.seed, fields: currentFields(), race: l.race, otherBuild: l.otherBuild, problems: l.problems };
  document.body.classList.add('rando-open');
  $('r-toggle').setAttribute('aria-expanded', 'true');
  showShared();
}

const TRACKER_DI = { standard: 'standard', mc: 'mapcompass', mcs: 'mapcompasskeys', full: 'keysanity' };

async function generateAndPlay() {
  if (isKara()) return generateKara();
  if (msu.count) msu.unlock();
  const btn = $('r-generate');
  if (btn.disabled) return;
  if (!(await refreshBaseStatus())) {
    status('First choose your Japanese 1.0 ROM with the Base ROM button.', 'bad');
    $('r-base-input').click();
    return;
  }
  // playing a shared seed exactly as linked? then don't overwrite this
  // player's own saved choices with the link's
  const fromLink = !!shared && !shared.kara && parseSeed($('r-seed').value) === shared.seed && settingsMatch(shared.fields);
  if (!fromLink) saveFields();
  const settings = readSettings();
  const fields = currentFields();
  const typed = parseSeed($('r-seed').value);
  btn.disabled = true;
  try {
    status('Patching base ROM…');
    const { rom: base, baseOk } = await buildBaseRom();
    let res = null, tries = 0, seed = typed ?? randomSeed();
    for (;;) {
      tries++;
      status(tries === 1 ? 'Generating seed…' : `Generating seed (attempt ${tries})…`);
      try {
        res = await runGenerator(settings, seed);
        if (res.winnable) break;
        throw new Error('the finished game wasn\'t beatable');
      } catch (e) {
        // the official generator also gives up on some seeds (alttpr.com just
        // asks you to try again); for random seeds we quietly roll a new one
        if (typed !== null) throw new Error(`Seed ${seed} doesn't work with these settings (${e.message}). Try another number, or clear the seed box for a random one.`);
        if (tries >= 8) throw e;
      }
      seed = randomSeed();
    }
    const rom = base;
    for (const w of res.patch) for (const [off, bytes] of Object.entries(w)) rom.set(bytes, Number(off));
    applyCosmetics(rom);
    if (msu.count) rom[0x18021A] = 0x01;   // game music off; the MSU pack plays instead
    const sprite = await kvGet('sprite').catch(() => null);
    if (sprite && sprite.bytes) {
      try { applySprite(rom, parseSprite(sprite.bytes)); } catch (e) { console.warn('[randomizer] sprite skipped:', e); }
    }
    updateChecksum(rom);

    const m = res.spoiler.meta || {};
    const name = `alttpr - ${m.logic}-${m.mode}-${m.goal}_${res.hash}.sfc`;
    last = { rom, name, fields, race: fromLink && shared.race, spoiler: { seed: res.seed, hash: res.hash, ...res.spoiler } };
    if (fromLink) { shared = null; clearLink(); showShared(); $('r-seed').value = ''; }
    playing = null;
    showLast();
    status(baseOk ? `Ready: ${res.hash}, code ${codeNames(codeForSeed(res.seed)).join(' / ')} (${(res.ms / 1000).toFixed(1)}s)`
      : `Ready: ${res.hash}. Note: the base ROM check didn't match alttpr.com's build; report it if anything looks off.`, baseOk ? 'ok' : 'bad');
    // fold the settings away so the game is on screen (any layout), and
    // remember it across the reload EmulatorJS needs to switch games
    document.body.classList.remove('rando-open');
    $('r-toggle').setAttribute('aria-expanded', 'false');
    try { localStorage.setItem('unified-kara-open', '0'); } catch (e) {}
    // keep it across the page reload EmulatorJS needs when switching games
    try { await kvSet('last-seed', last); } catch (e) {}

    window.UnifiedApp.playRom(rom, name, {
      gamemode: settings.mode,
      dungeonitems: TRACKER_DI[settings.dungeon_items] || 'standard',
      swordless: settings.weapons === 'swordless' ? 'yes' : 'no',
      gtcrystals: String(m.crystals_tower ?? 7),
    });
  } catch (e) {
    console.error(e);
    status(String(e.message || e), 'bad');
  } finally {
    btn.disabled = false;
  }
}

// ── Kara's branch, generated here ────────────────────────────────────────────
let karaUi = null;
const isKara = () => $('r-gen').value === 'kara';

function setGen(g) {
  $('r-gen').value = g;
  applyGen();
}
function applyGen() {
  const kara = isKara();
  document.body.classList.toggle('gen-kara', kara);
  $('r-gen-name').textContent = kara ? ' · Kara\'s branch' : ' · alttpr.com';
  document.querySelectorAll('#r-gen-menu [data-gen]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.gen === $('r-gen').value)));
  // start Python in the background, so the first Kara seed is quicker
  clearTimeout(applyGen.t);
  if (kara && karaUi && karaUi.where() === 'browser') applyGen.t = setTimeout(Kara.prewarm, 800);
  else Kara.discardWarm();
}

function karaSeed() {
  // her generator's own range for random seeds
  return Math.floor(randomSeed() / 4294967296 * 1000000000);
}

async function generateKara({ local = false, note = '' } = {}) {
  if (!local && karaUi.where() === 'server' && parseSeed($('r-seed').value) === null && !(shared && shared.kara)) {
    const settings = karaUi.get(), race = karaUi.race();
    saveFields(); karaUi.hold(false); karaUi.save();
    return playGwaa(null, {
      settings, race,
      // her server out of reach: make a normal seed here instead (never a race one)
      fallback: race ? null : () => generateKara({ local: true, note: 'Kara\'s server couldn\'t be reached, so this seed was made in your browser. ' }),
    });
  }
  if (msu.count) msu.unlock();
  const btn = $('r-generate');
  if (btn.disabled) return;
  if (!(await refreshBaseStatus())) {
    status('First choose your Japanese 1.0 ROM with the Base ROM button.', 'bad');
    $('r-base-input').click();
    return;
  }
  const settings = karaUi.get();
  const typed = parseSeed($('r-seed').value);
  const fromLink = !!shared && !!shared.kara && typed === shared.seed && JSON.stringify(settings) === JSON.stringify(shared.kara);
  if (!fromLink) { saveFields(); karaUi.hold(false); karaUi.save(); }
  btn.disabled = true;
  $('r-stop').hidden = false;
  const started = Date.now();
  let stage = 'Starting…';
  const show = () => status(`${stage} ${Math.round((Date.now() - started) / 1000)}s`);
  const tick = setInterval(show, 1000);
  try {
    const jp = await kvGet('base-jp10');
    const { rom: base, ok } = await Kara.baseRom(jp);
    if (!ok) console.warn('[kara] base ROM MD5 differs from Kara\'s build');
    let seed = typed ?? karaSeed(), res = null;
    for (let tries = 1; ; tries++) {
      try {
        res = await Kara.generate(seed, settings, (t) => {
          stage = tries > 1 && /^Generating/.test(t) ? `Generating seed (attempt ${tries} of ${Kara.KARA_TRIES})…` : t;
          show();
        });
        break;
      } catch (e) {
        if (e.cancelled) throw e;
        // her server also tries a few seeds before giving up
        if (typed !== null) throw new Error(`Seed ${seed} doesn't work with these settings (${e.message}). Try another number, or clear the seed box for a random one.`);
        if (tries >= Kara.KARA_TRIES) throw new Error(`Couldn't make a seed with these settings in ${tries} tries (${e.message}).`);
        seed = karaSeed();
      }
    }
    const rom = Kara.patchRom(base, res.patch);
    applyCosmetics(rom, { menuSpeed: false });
    if (msu.count) rom[0x18021A] = 0x01;
    const sprite = await kvGet('sprite').catch(() => null);
    if (sprite && sprite.bytes) {
      try { applySprite(rom, parseSprite(sprite.bytes)); } catch (e) { console.warn('[randomizer] sprite skipped:', e); }
    }
    updateChecksum(rom);
    const code = codeFromRom(rom);
    const name = `alttpr-kara - ${seed}.sfc`;
    last = { rom, name, kara: settings, code, race: fromLink && shared.race, spoiler: { ...(res.spoiler || {}), seed } };
    if (fromLink) { shared = null; clearLink(); showShared(); $('r-seed').value = ''; karaUi.hold(false); karaSaved = null; }
    playing = null;
    showLast();
    const gaps = Kara.trackerGaps(settings);
    status(note + `Ready: Kara seed ${seed}` + (code ? `, code ${codeNames(code).join(' / ')}` : '') + ` (${(res.ms / 1000).toFixed(1)}s)` +
      (gaps.length ? `. The tracker doesn't follow ${gaps.join(', ')}.` : '') +
      (ok ? '' : ' Note: the base ROM check didn\'t match Kara\'s build; report it if anything looks off.'), ok ? 'ok' : 'bad');
    document.body.classList.remove('rando-open');
    $('r-toggle').setAttribute('aria-expanded', 'false');
    try { localStorage.setItem('unified-kara-open', '0'); } catch (e) {}
    try { await kvSet('last-seed', last); } catch (e) {}
    window.UnifiedApp.playRom(rom, name, Kara.trackerFor(settings));
  } catch (e) {
    if (e.cancelled) status('Stopped.', '');
    else { console.error(e); status(String(e.message || e), 'bad'); }
  } finally {
    clearInterval(tick);
    btn.disabled = false;
    $('r-stop').hidden = true;
    // a fresh Python for the next seed
    setTimeout(() => { if (isKara() && karaUi.where() === 'browser') Kara.prewarm(); }, 1500);
  }
}

// A seed from Kara's server: a new one from these settings (id null), or one
// by its id (a link from her site).
let karaAbort = null;
async function playGwaa(id, { settings = null, race = false, fallback = null } = {}) {
  if (msu.count) msu.unlock();
  const btn = $('r-generate');
  if (btn.disabled) return;
  if (!(await refreshBaseStatus())) {
    status('First choose your Japanese 1.0 ROM with the Base ROM button.', 'bad');
    $('r-base-input').click();
    return;
  }
  btn.disabled = true;
  $('r-stop').hidden = false;
  karaAbort = new AbortController();
  const signal = karaAbort.signal;
  const started = Date.now();
  let stage = id ? `Getting Kara seed ${id}…` : `Asking Kara's server for a ${race ? 'race ' : ''}seed…`;
  const show = () => status(`${stage} ${Math.round((Date.now() - started) / 1000)}s`);
  const tick = setInterval(show, 1000);
  show();
  let fellBack = false;
  try {
    if (!id) id = await Kara.serverGenerate(settings, race, signal);
    const data = await Kara.serverSeed(id, { signal, onWait: () => { stage = `Kara's server is making seed ${id}…`; } });
    stage = 'Building the ROM…';
    const jp = await kvGet('base-jp10');
    const rom = Kara.serverRom(jp, data);
    const s = Kara.normalize(data.settings || {});
    const isRace = !!data.settings && data.settings.race === 'race';
    applyCosmetics(rom, { menuSpeed: false });
    if (msu.count) rom[0x18021A] = 0x01;
    const sprite = await kvGet('sprite').catch(() => null);
    if (sprite && sprite.bytes) {
      try { applySprite(rom, parseSprite(sprite.bytes)); } catch (e) { console.warn('[randomizer] sprite skipped:', e); }
    }
    updateChecksum(rom);
    const code = codeFromRom(rom);
    const name = `GK_${id}.sfc`;
    last = { rom, name, gwaa: id, kara: s, code, race: isRace, spoiler: { ...(data.spoiler || {}), seed: id } };
    playing = null;
    showLast();
    const gaps = Kara.trackerGaps(s);
    status(`Ready: Kara ${isRace ? 'race seed' : 'seed'} ${id}` + (code ? `, code ${codeNames(code).join(' / ')}` : '') +
      (gaps.length ? `. The tracker doesn't follow ${gaps.join(', ')}.` : ''), 'ok');
    document.body.classList.remove('rando-open');
    $('r-toggle').setAttribute('aria-expanded', 'false');
    try { localStorage.setItem('unified-kara-open', '0'); } catch (e) {}
    try { await kvSet('last-seed', last); } catch (e) {}
    window.UnifiedApp.playRom(rom, name, Kara.trackerFor(s));
  } catch (e) {
    if (e.cancelled) status('Stopped.', '');
    else if (e.unreachable && fallback) fellBack = true;
    else { console.error(e); status(String(e.message || e), 'bad'); }
  } finally {
    clearInterval(tick);
    karaAbort = null;
    btn.disabled = false;
    $('r-stop').hidden = true;
  }
  if (fellBack) fallback();
}

// ── an alttpr.com seed, played here ──────────────────────────────────────────
const kv = { get: kvGet, set: kvSet };
async function ownBase() {
  const { rom, baseOk } = await buildBaseRom();
  return { rom, md5: baseOk ? BASE_MD5 : md5(rom) };
}
const ALTTPR_MODES = ['open', 'standard', 'inverted', 'retro'];

async function playAlttprSeed(id) {
  if (msu.count) msu.unlock();
  const btn = $('r-generate');
  if (btn.disabled) return;
  if (!(await refreshBaseStatus())) {
    status('First choose your Japanese 1.0 ROM with the Base ROM button.', 'bad');
    $('r-base-input').click();
    return;
  }
  btn.disabled = true;
  try {
    status(`Getting seed ${id} from alttpr.com…`);
    const seed = await fetchAlttprSeed(id);
    status('Building the ROM…');
    const jp = await kvGet('base-jp10');
    const base = await baseFor(seed, jp, ownBase, kv);
    const rom = patchSeed(base, seed.data);
    const m = (seed.data.spoiler && seed.data.spoiler.meta) || {};
    // a race seed may lock quickswap off
    applyCosmetics(rom, { quickswap: !m.tournament || !!m.allow_quickswap });
    if (msu.count) rom[0x18021A] = 0x01;
    const sprite = await kvGet('sprite').catch(() => null);
    if (sprite && sprite.bytes) {
      try { applySprite(rom, parseSprite(sprite.bytes)); } catch (e) { console.warn('[randomizer] sprite skipped:', e); }
    }
    updateChecksum(rom);
    const code = codeFromRom(rom);
    const name = `alttpr - ${id}.sfc`;
    const spoilerOn = m.spoilers === 'on' && seed.data.spoiler && Object.keys(seed.data.spoiler).length > 1;
    last = { rom, name, alttpr: id, code, race: !spoilerOn, spoiler: { seed: id, hash: id, ...(seed.data.spoiler || {}) } };
    playing = null;
    showLast();
    status(`Ready: alttpr.com seed ${id}${m.notes ? ' (' + String(m.notes).replace(/<[^>]*>/g, '').trim() + ')' : ''}` +
      (code ? `, code ${codeNames(code).join(' / ')}` : ''), 'ok');
    document.body.classList.remove('rando-open');
    $('r-toggle').setAttribute('aria-expanded', 'false');
    try { localStorage.setItem('unified-kara-open', '0'); } catch (e) {}
    try { await kvSet('last-seed', last); } catch (e) {}
    window.UnifiedApp.playRom(rom, name, {
      gamemode: ALTTPR_MODES.includes(m.mode) ? m.mode : 'open',
      dungeonitems: TRACKER_DI[m.dungeon_items] || 'standard',
      swordless: m.weapons === 'swordless' ? 'yes' : 'no',
      gtcrystals: String(m.entry_crystals_tower ?? 7),
      bossshuffle: m['enemizer.boss_shuffle'] && m['enemizer.boss_shuffle'] !== 'none' ? 'yes' : 'no',
      enemizer: m['enemizer.enemy_shuffle'] && m['enemizer.enemy_shuffle'] !== 'none' ? 'yes' : 'no',
    });
  } catch (e) {
    console.error(e);
    status(String(e.message || e), 'bad');
    if (e.needsRelay) { const d = $('rando-bar').querySelector('details'); if (d) d.open = true; $('r-relay').focus(); }
  } finally {
    btn.disabled = false;
  }
}

// ── "Load a seed": paste a link or a number ──────────────────────────────────
// This app's seed link -> its settings and seed number; an alttpr.com link or
// seed id -> that seed; a plain number -> that seed number with the current
// settings. Then it plays.
function loadPasted(text) {
  text = String(text || '').trim();
  if (!text) { status('Paste a seed link, an alttpr.com link, or a seed number.', 'bad'); return false; }
  let url = null;
  try { url = new URL(text); } catch (e) {}
  const gk = Kara.gwaaId(text);
  if (gk) { setGen('kara'); playGwaa(gk); return true; }
  if (url && url.searchParams.get('gen') === 'kara') {
    const k = Kara.readLink(url.search);
    if (!k) { status('That link doesn\'t have a seed in it.', 'bad'); return false; }
    takeKaraLink(k);
    generateAndPlay();
    return true;
  }
  if (url && url.searchParams.has('seed')) {
    const l = readLink(url.search, $);
    if (!l) { status('That link doesn\'t have a seed in it.', 'bad'); return false; }
    setGen('alttpr');
    Object.entries(l.fields).forEach(([id, v]) => { $(id).value = v; });
    $('r-seed').value = String(l.seed);
    shared = { seed: l.seed, fields: currentFields(), race: l.race, otherBuild: l.otherBuild, problems: l.problems };
    showShared();
    generateAndPlay();
    return true;
  }
  const id = alttprId(text);
  if (id) { playAlttprSeed(id); return true; }
  if (/^\d{1,10}$/.test(text)) {
    $('r-seed').value = text;
    generateAndPlay();
    return true;
  }
  status('That isn\'t a seed link, an alttpr.com seed, or a seed number.', 'bad');
  return false;
}

// Called by "Load ROM…": if the file is the plain Japanese 1.0 ROM, save it
// as the base ROM and generate a seed with the current settings.
async function useIfBaseRom(bytes) {
  let b = stripHeader(bytes);
  if (b.length !== 0x100000 || md5(b) !== JP10_MD5) return false;
  await kvSet('base-jp10', b.slice());
  await refreshBaseStatus();
  document.body.classList.add('rando-open');
  $('r-toggle').setAttribute('aria-expanded', 'true');
  status('That\'s the original game, so it\'s now your base ROM. Generating a seed…', 'ok');
  generateAndPlay();
  return true;
}

const LINK_PREVIEW = 'https://alttpr-assets.s3.us-east-2.amazonaws.com/001.link.1.zspr.png';

async function refreshSprite() {
  const sp = await kvGet('sprite').catch(() => null);
  $('r-sprite-name').textContent = sp ? sp.label : 'Default Link';
  $('r-sprite-name').title = sp ? sp.label : '';
  $('r-sprite-clear').hidden = !sp;
  // the preview: alttpr.com's own picture for library sprites, otherwise the
  // head drawn from the file (and its whole sheet on click)
  const img = $('r-sprite-prev').querySelector('img'), cv = $('r-sprite-prev').querySelector('canvas');
  let parsed = null;
  try { parsed = sp && sp.bytes ? parseSprite(sp.bytes) : null; } catch (e) {}
  const own = !!parsed && !sp.preview && drawHead(parsed, cv);
  cv.hidden = !own;
  img.hidden = own;
  // a library sprite whose picture is missing on alttpr's host: draw it
  img.onerror = () => {
    if (parsed && drawHead(parsed, cv)) { img.hidden = true; cv.hidden = false; }
  };
  if (!own) img.src = (sp && sp.preview) || LINK_PREVIEW;
  $('r-sprite-prev').title = own ? 'Show the whole sprite sheet' : 'Browse the sprite library';
  $('r-sprite-prev').dataset.sheet = own ? '1' : '';
  $('r-sprite-sheet').hidden = true;
  if (own) drawSheet(parsed, $('r-sprite-sheet').querySelector('canvas'));
}

async function useLibrarySprite(entry) {
  if (isPlainLink(entry)) {
    await kvDel('sprite');
    status('Back to the default Link sprite for the next seed.', 'ok');
    refreshSprite();
    return;
  }
  const bytes = await fetchSprite(entry);
  parseSprite(bytes);   // throws with a readable reason if it isn't a sprite
  const label = labelOf(entry);
  await kvSet('sprite', { bytes: bytes.slice(), label, preview: entry.preview });
  status(`Sprite set: ${label}. It applies to the next seed you generate.`, 'ok');
  refreshSprite();
}

function spriteLabel(info, fileName) {
  if (!info.name) return fileName;
  return info.author ? `${info.name} by ${info.author}` : info.name;
}

// ── MSU-1 packs ──────────────────────────────────────────────────────────────
function packName(files) {
  const n = files.map((f) => f.name.replace(/-\d+\.pcm$/i, ''));
  return n.every((x) => x === n[0]) ? n[0] : 'MSU-1 pack';
}

function showMsu(name) {
  $('r-msu-name').textContent = msu.count ? `${name} (${msu.count} tracks)` : 'Off';
  $('r-msu-clear').hidden = !msu.count;
}

async function loadMsuPack(fileList) {
  const files = [...fileList].filter((f) => trackNumber(f.name) !== null);
  if (!files.length) throw new Error('Choose the .pcm files from an MSU-1 pack (named like pack-1.pcm, pack-2.pcm, …).');
  const tracks = new Map(files.map((f) => [trackNumber(f.name), f]));
  const name = packName(files);
  msu.setTracks(tracks);
  showMsu(name);
  msu.start();
  status(`Saving ${name} in this browser…`);
  try {
    await kvSet('msu-pack', { name, tracks: [...tracks].map(([n, f]) => [n, new Blob([f], { type: 'application/octet-stream' })]) });
    status(`MSU-1 pack ready: ${name}. It plays on seeds you generate from now on.`, 'ok');
  } catch (e) {
    console.warn('[msu] could not store pack', e);
    status(`MSU-1 pack ready for this visit: ${name}. It was too big to save in the browser, so choose it again next time.`, 'ok');
  }
}

// Called by "Load ROM…" for seed files: turn the game's music off when a pack
// is loaded, so the pack plays instead (randomizer ROMs only).
function prepareLoadedRom(bytes) {
  if (!msu.count) return bytes;
  const off = bytes.length % 1024 === 512 ? 512 : 0;
  const h = String.fromCharCode(bytes[off + 0x7FC0], bytes[off + 0x7FC1]);
  if (bytes.length < off + 0x200000 || (h !== 'VT' && h !== 'GK')) return bytes;
  const rom = bytes.slice(off);
  rom[0x18021A] = 0x01;
  updateChecksum(rom);
  msu.unlock();
  return rom;
}

function initMsu() {
  $('r-msu-input').addEventListener('change', async (ev) => {
    const files = ev.target.files;
    msu.unlock();
    try { await loadMsuPack(files); } catch (e) { status(String(e.message || e), 'bad'); }
    ev.target.value = '';
  });
  $('r-msu-clear').addEventListener('click', async () => {
    msu.setTracks(new Map());
    showMsu('');
    await kvDel('msu-pack');
    status('MSU-1 off. Seeds you generate from now on use the game\'s own music.', 'ok');
  });
  // iOS only starts audio from a tap, so (re)unlock on any tap while a pack is loaded
  ['touchend', 'click', 'keydown'].forEach((t) => document.addEventListener(t, () => { if (msu.count) msu.unlock(); }, true));
  kvGet('msu-pack').then((p) => {
    if (p && p.tracks && p.tracks.length) {
      msu.setTracks(new Map(p.tracks));
      showMsu(p.name);
      msu.start();
    }
  }).catch(() => {});
}

export function init() {
  $('r-sprite-input').addEventListener('change', async (ev) => {
    const f = ev.target.files && ev.target.files[0];
    ev.target.value = '';
    if (!f) return;
    try {
      const bytes = new Uint8Array(await f.arrayBuffer());
      const info = parseSprite(bytes);
      const label = spriteLabel(info, f.name.replace(/\.[^.]+$/, ''));
      await kvSet('sprite', { bytes: bytes.slice(), label });
      status(`Sprite set: ${label}. It applies to the next seed you generate.`, 'ok');
    } catch (e) {
      status(String(e.message || e), 'bad');
    }
    refreshSprite();
  });
  $('r-sprite-clear').addEventListener('click', async () => {
    await kvDel('sprite');
    status('Back to the default Link sprite for the next seed.', 'ok');
    refreshSprite();
  });
  refreshSprite();

  window.UnifiedRando = { useIfBaseRom, prepareLoadedRom, noteRom };
  if (window.__pendingRomNote) { noteRom(window.__pendingRomNote.bytes, window.__pendingRomNote.name); window.__pendingRomNote = null; }
  $('r-sprite-lib').addEventListener('click', () => openLibrary($, useLibrarySprite));
  $('r-sprite-prev').addEventListener('click', () => {
    if ($('r-sprite-prev').dataset.sheet) $('r-sprite-sheet').hidden = !$('r-sprite-sheet').hidden;
    else openLibrary($, useLibrarySprite);
  });
  document.addEventListener('click', (e) => {
    if (!$('r-sprite-sheet').hidden && !e.target.closest('#r-sprite-sheet, #r-sprite-prev')) $('r-sprite-sheet').hidden = true;
  });
  $('r-paste-go').addEventListener('click', () => { if (loadPasted($('r-paste').value)) $('r-paste').value = ''; });
  $('r-paste').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); if (loadPasted($('r-paste').value)) $('r-paste').value = ''; }
  });
  // Pasting anywhere on the page (not into a box) works too, for anything
  // that looks like a seed link.
  document.addEventListener('paste', (e) => {
    const t = e.target;
    if (t && t.closest && t.closest('input, textarea, select, [contenteditable]')) return;
    const text = (e.clipboardData && e.clipboardData.getData('text')) || '';
    let isLink = false;
    try { isLink = new URL(text.trim()).searchParams.has('seed'); } catch (x) {}
    if (!isLink && !alttprId(text) && !Kara.gwaaId(text)) return;
    if (!/alttpr\.com|alttpr\.gwaa\.kiwi\/seed\/|[?&]seed=/.test(text)) return;   // a bare id or number only from the box
    e.preventDefault();
    loadPasted(text);
  });
  // empty = the built-in relay; a value = the player's own
  $('r-relay').placeholder = DEFAULT_RELAY.replace(/^https:\/\//, '');
  $('r-relay').value = ownRelay();
  $('r-relay').addEventListener('change', () => {
    setRelayUrl($('r-relay').value);
    $('r-relay').value = ownRelay();
    status(ownRelay() ? 'Using your own relay for alttpr.com seeds.' : 'Using the built-in relay for alttpr.com seeds.', 'ok');
  });
  $('r-share').addEventListener('click', () => copyLink(false));
  $('r-share-race').addEventListener('click', () => copyLink(true));
  initMsu();
  karaUi = buildKaraUi($('r-kara'), $('r-kara-more-body'));
  loadFields();
  FIELDS.forEach((id) => $(id) && $(id).addEventListener('change', saveFields));
  applyGen();
  $('r-gen').addEventListener('change', () => {
    // a shared seed for the other generator no longer applies
    if (shared && (!!shared.kara !== isKara())) {
      if (shared.kara) { karaUi.hold(false); karaUi.set(karaSaved || Kara.presetSettings('default'), { persist: false }); }
      shared = null; clearLink(); showShared(); $('r-seed').value = '';
    }
    applyGen();
    // show the settings for the generator just picked
    document.body.classList.add('rando-open');
    $('r-toggle').setAttribute('aria-expanded', 'true');
  });
  $('r-stop').addEventListener('click', () => { if (karaAbort) karaAbort.abort(); Kara.cancel(); });
  karaUi.onWhere(applyGen);
  // the arrow beside Randomizer: a small menu to pick the generator
  const genMenu = $('r-gen-menu'), genBtn = $('r-gen-btn');
  const items = () => [...genMenu.querySelectorAll('[data-gen]')];
  function menu(open) {
    genMenu.hidden = !open;
    genBtn.setAttribute('aria-expanded', String(open));
    if (open) (items().find((b) => b.getAttribute('aria-checked') === 'true') || items()[0]).focus();
  }
  genBtn.addEventListener('click', () => menu(genMenu.hidden));
  items().forEach((b) => b.addEventListener('click', () => {
    menu(false);
    genBtn.focus();
    if ($('r-gen').value === b.dataset.gen) {   // same one: just show its settings
      document.body.classList.add('rando-open');
      $('r-toggle').setAttribute('aria-expanded', 'true');
      return;
    }
    $('r-gen').value = b.dataset.gen;
    $('r-gen').dispatchEvent(new Event('change'));
  }));
  document.addEventListener('pointerdown', (e) => { if (!genMenu.hidden && !e.target.closest('#rando-split')) menu(false); }, true);
  // a click in a tracker or the game (their own frames) doesn't reach this page
  window.addEventListener('blur', () => { if (!genMenu.hidden) menu(false); });
  genMenu.addEventListener('keydown', (e) => {
    const list = items(), i = list.indexOf(document.activeElement);
    if (e.key === 'Escape') { e.preventDefault(); menu(false); genBtn.focus(); }
    else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      list[(i + (e.key === 'ArrowDown' ? 1 : list.length - 1)) % list.length].focus();
    }
  });
  $('r-base-input').addEventListener('change', async (ev) => {
    const f = ev.target.files && ev.target.files[0];
    ev.target.value = '';
    if (!f) return;
    try {
      await setBaseRom(f);
      status('Base ROM saved. Pick your settings and press Generate.', 'ok');
    } catch (e) {
      status(String(e.message || e), 'bad');
    }
    refreshBaseStatus();
  });
  $('r-generate').addEventListener('click', generateAndPlay);
  $('r-download').addEventListener('click', () => last && download(last.rom, last.name, 'application/octet-stream'));
  $('r-spoiler').addEventListener('click', () => last && download(
    new TextEncoder().encode(JSON.stringify(last.spoiler, null, 2)), last.name.replace(/\.sfc$/, '') + '_spoiler.json', 'application/json'));
  $('r-toggle').addEventListener('click', () => {
    const open = document.body.classList.toggle('rando-open');
    $('r-toggle').setAttribute('aria-expanded', String(open));
    try { localStorage.setItem('unified-kara-open', open ? '1' : '0'); } catch (e) {}
  });
  // While a game is running, the settings bar folds itself away as soon as
  // you go back to playing: a click on the game, a controller button, or a
  // key that isn't typed into one of the bar's fields. The Randomizer button
  // brings it back.
  const gameRunning = () => { const e = window.EJS_emulator; return !!(e && e.gameManager); };
  function foldForPlay() {
    if (!document.body.classList.contains('rando-open') || !gameRunning()) return;
    if (!$('sprite-lib').hidden) return;
    document.body.classList.remove('rando-open');
    $('r-toggle').setAttribute('aria-expanded', 'false');
    try { localStorage.setItem('unified-kara-open', '0'); } catch (e) {}
    setTimeout(() => window.dispatchEvent(new Event('resize')), 30);
  }
  $('game-wrap').addEventListener('pointerdown', foldForPlay, true);
  document.addEventListener('keydown', (e) => {
    const t = e.target;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (t && t.closest && t.closest('#sprite-lib, #rando-split, input, select, textarea')) return;
    // (a button still focused from the bar would otherwise take Space/Enter)
    if (document.body.classList.contains('rando-open') && gameRunning() && t && t.tagName === 'BUTTON') t.blur();
    foldForPlay();
  }, true);
  setInterval(() => {
    if (!document.body.classList.contains('rando-open') || !gameRunning()) return;
    let pads = [];
    try { pads = Array.from(navigator.getGamepads ? navigator.getGamepads() : []); } catch (e) {}
    if (pads.some((gp) => gp && gp.buttons.some((b) => b.pressed))) foldForPlay();
  }, 200);

  let open = true;
  try { open = localStorage.getItem('unified-kara-open') !== '0'; } catch (e) {}
  document.body.classList.toggle('rando-open', open);
  $('r-toggle').setAttribute('aria-expanded', String(open));
  refreshBaseStatus();
  // load the generator's modules in the background so the first Generate is quick
  setTimeout(() => { try { if (!isKara()) getWorker(); } catch (e) {} }, 2000);
  kvGet('last-seed').then((v) => { if (v && v.rom) { last = v; showLast(); } }).catch(() => {});
  // opened from a seed link: set it up, ready to play (after loadFields, so
  // the link's settings win)
  takeSharedLink();
}
