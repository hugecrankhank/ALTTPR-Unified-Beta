// Kara's branch (alttpr.gwaa.kiwi), generated here: her generator runs in the
// browser (worker.js), and the seed's patch goes onto her base ROM, built from
// the player's own Japanese 1.0 ROM, the same way her generator builds its
// .sfc files.

import { md5 } from '../md5.js';
import { applyBps } from '../bps.js';
import { SETTINGS, PRESETS, defaults, normalize, presetSettings, toArgs, trackerFor, trackerGaps,
  encodeSettings, decodeSettings } from './settings.js';

export { SETTINGS, PRESETS, defaults, normalize, presetSettings, toArgs, trackerFor, trackerGaps };

// Which build made a seed: her generator's commit and the Python it ran on.
// A link made with another build may give a different game for the same seed.
export const KARA_COMMIT = 'c0c177dfed071fa692766e7f43be51adf87ea4b2';
export const KARA_ID = 'gk-' + KARA_COMMIT.slice(0, 7) + '-py0.27.7';
export const KARA_TRIES = 5;   // her server's tries per seed

// ── the generator, one worker per seed ───────────────────────────────────────
let warm = null;      // a started worker waiting for a seed: { w, ready, stage }
let current = null;   // { w, reject } while a seed is being made

function startWorker() {
  const w = new Worker(new URL('worker.js', import.meta.url), { type: 'module' });
  const box = { w, stage: 'Starting…', onStage: null };
  box.ready = new Promise((resolve, reject) => {
    w.onmessage = (e) => {
      const m = e.data || {};
      if (m.type === 'stage') { box.stage = m.text; if (box.onStage) box.onStage(m.text); }
      else if (m.type === 'ready') resolve();
      else if (m.type === 'error') reject(new Error(m.error));
    };
    w.onerror = (e) => reject(new Error(e.message || 'Kara\'s generator failed to start'));
  });
  box.ready.catch(() => {});
  return box;
}

/** Start Python in the background so the next Generate is quicker. */
export function prewarm() {
  if (!warm && !current) warm = startWorker();
}
export function discardWarm() {
  if (warm) { warm.w.terminate(); warm = null; }
}

/** Stop the seed being made (its promise rejects with { cancelled: true }). */
export function cancel() {
  if (!current) return false;
  current.w.terminate();
  const e = new Error('Stopped.');
  e.cancelled = true;
  current.reject(e);
  current = null;
  return true;
}

/** Make one seed: { seed, patch, spoiler, ms }. onStage(text) reports progress. */
export function generate(seed, settings, onStage) {
  const box = warm || startWorker();
  warm = null;
  return new Promise((resolve, reject) => {
    current = { w: box.w, reject };
    const done = (fn, v) => { if (current && current.w === box.w) { current = null; box.w.terminate(); fn(v); } };
    box.onStage = onStage;
    if (onStage) onStage(box.stage);
    box.ready.then(() => {
      box.w.onmessage = (e) => {
        const m = e.data || {};
        if (m.type === 'stage') { if (onStage) onStage(m.text); }
        else if (m.type === 'done') done(resolve, m);
        else if (m.type === 'error') done(reject, new Error(m.error));
      };
      box.w.onerror = (e) => done(reject, new Error(e.message || 'Kara\'s generator stopped'));
      box.w.postMessage({ type: 'gen', seed, args: toArgs(settings) });
    }, (e) => done(reject, e));
  });
}

// ── the ROM ──────────────────────────────────────────────────────────────────
const BASE_MD5 = 'd80446af9eeb1726d2b6c1303bec1226';   // her base ROM (Rom.py RANDOMIZERBASEHASH)
let basePatch = null;

/** Her base ROM from the Japanese 1.0 ROM: { rom, ok }. */
export async function baseRom(jp) {
  if (!basePatch) {
    const r = await fetch(new URL('alttpr-python/data/base2current.bps', import.meta.url));
    if (!r.ok) throw new Error(`Couldn't load Kara's base patch (${r.status}).`);
    basePatch = new Uint8Array(await r.arrayBuffer());
  }
  const rom = applyBps(jp.subarray(0, 0x100000), basePatch);
  return { rom, ok: md5(rom) === BASE_MD5 };
}

/** The seed's patch onto a copy of the base ROM (2 MB, or more if it needs it). */
export function patchRom(base, patch) {
  let size = Math.max(0x200000, base.length);
  for (const [off, bytes] of Object.entries(patch)) size = Math.max(size, Number(off) + bytes.length);
  const rom = new Uint8Array(size);
  rom.set(base);
  for (const [off, bytes] of Object.entries(patch)) rom.set(bytes, Number(off));
  return rom;
}

// ── links ────────────────────────────────────────────────────────────────────
export function buildLink(seed, settings, race) {
  const u = new URL(location.pathname, location.origin);
  u.searchParams.set('gen', 'kara');
  u.searchParams.set('seed', String(seed));
  const k = encodeSettings(settings);
  if (k) u.searchParams.set('k', k);
  if (race) u.searchParams.set('race', '1');
  u.searchParams.set('v', KARA_ID);
  return u.toString();
}

/** null, or { seed, settings, race, otherBuild, problems } */
export function readLink(search) {
  const q = new URLSearchParams(search);
  if (q.get('gen') !== 'kara') return null;
  const seedText = q.get('seed');
  if (seedText === null || !/^\d{1,10}$/.test(seedText)) return null;
  const { settings, unknown } = decodeSettings(q.get('k') || '');
  const v = q.get('v');
  return { seed: Number(seedText) % 4294967296, settings, race: q.get('race') === '1', otherBuild: !!v && v !== KARA_ID, problems: unknown };
}

/** Short words for what's not default, for the shared-seed banner. */
export function describe(settings) {
  const preset = PRESETS.find((x) => x.id === presetOf(settings));
  if (preset) return [`Preset: ${preset.label}`];
  const s = normalize(settings), d = defaults();
  const parts = [];
  for (const def of SETTINGS) {
    if (s[def.key] === d[def.key]) continue;
    const v = def.values.find((x) => x[0] === s[def.key]);
    parts.push(`${def.label}: ${v ? v[1] : s[def.key]}`);
  }
  return parts.length ? parts : ['Kara\'s default settings'];
}

/** The preset these settings match, if any. */
export function presetOf(settings) {
  const s = JSON.stringify(normalize(settings));
  const p = PRESETS.find((x) => JSON.stringify(presetSettings(x.id)) === s);
  return p ? p.id : '';
}

// ── Kara's server (api.alttpr.gwaa.kiwi), with her permission ────────────────
// Seeds made there are the same games her site makes, race seeds keep their
// spoiler on her server, and her seed links (alttpr.gwaa.kiwi/seed/…) load
// here. Her site has to allow this site's address (CORS) for the browser to
// reach it.
export const KARA_API = 'https://api.alttpr.gwaa.kiwi';
export const KARA_SITE = 'https://alttpr.gwaa.kiwi';

export function siteLink(id) { return `${KARA_SITE}/seed/${id}`; }

/** "https://alttpr.gwaa.kiwi/seed/AbC123xyZ9" (or without https://) -> the id. */
export function gwaaId(text) {
  const m = String(text || '').trim().match(/alttpr\.gwaa\.kiwi\/seed\/([A-Za-z0-9]{10})\b/);
  return m ? m[1] : null;
}

function serverError(e) {
  if (e && e.name === 'AbortError') { const x = new Error('Stopped.'); x.cancelled = true; return x; }
  if (e instanceof TypeError) {
    const x = new Error('Kara\'s server couldn\'t be reached from here (it may not allow this site yet, or it\'s offline).');
    x.unreachable = true;
    return x;
  }
  return e;
}

/** Ask her server for a seed: its id. */
export async function serverGenerate(settings, race, signal) {
  let r;
  try {
    r = await fetch(`${KARA_API}/generate`, {
      method: 'POST', signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ randomizer: 'base', race: race ? 'race' : 'normal', ...normalize(settings) }),
    });
  } catch (e) { throw serverError(e); }
  const text = (await r.text()).trim().replace(/^"|"$/g, '');
  if (!r.ok || !/^[A-Za-z0-9]{10}$/.test(text)) throw new Error(`Kara's server didn't accept those settings (${r.status}).`);
  return text;
}

/** A seed from her server, waiting while it's still being made: { settings, meta, patch, spoiler, created }. */
export async function serverSeed(id, { signal, onWait } = {}) {
  const started = Date.now();
  for (;;) {
    let r;
    try { r = await fetch(`${KARA_API}/seed/${id}`, { signal }); } catch (e) { throw serverError(e); }
    if (r.status === 409 || r.status === 202) {
      if (Date.now() - started > 10 * 60 * 1000) throw new Error('Kara\'s server is taking too long with this seed. Try its link again later.');
      if (onWait) onWait(Date.now() - started);
      // gentle on her server (she asked): every 3 s at first, slowing to
      // every 10 s for seeds that take a while
      const waited = Date.now() - started;
      const every = waited < 30000 ? 3000 : waited < 120000 ? 5000 : 10000;
      await new Promise((res, rej) => {
        const t = setTimeout(res, every);
        if (signal) signal.addEventListener('abort', () => { clearTimeout(t); rej(serverError({ name: 'AbortError' })); }, { once: true });
      });
      continue;
    }
    let data = null;
    try { data = await r.json(); } catch (e) {}
    if (r.ok && data && data.patch) return data;
    if (data && data.retry) throw new Error('Kara\'s server couldn\'t make this seed with these settings. Try again, or change a setting.');
    if (r.status === 404) throw new Error('Kara\'s site has no seed with that id.');
    throw new Error(`Kara's server didn't send the seed (${r.status}).`);
  }
}

/**
 * The ROM for a seed from her server, the way her site's seed page builds it:
 * her patch onto the Japanese 1.0 ROM, then her page's defaults for the two
 * options this app doesn't offer (fast fanfare off, collection rate shown
 * where the goal allows it). Cosmetics and the checksum are the caller's.
 */
export function serverRom(jp, data) {
  const bin = atob(data.patch);
  const patch = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) patch[i] = bin.charCodeAt(i);
  const rom = applyBps(jp.subarray(0, 0x100000), patch);
  rom[0x1800AF] = 0x10;
  const goal = data.settings && data.settings.goal;
  if (!['triforce_hunt', 'trinity', 'ganon_hunt'].includes(goal)) rom[0x180039] = 0x01;
  return rom;
}
