// Seeds from alttpr.com, played here.
//
// An alttpr.com seed is stored on alttpr.com: the seed's own patch
// (/hash/<id>), and which base ROM build it needs (/api/h/<id>, a BPS patch
// at /bps/<md5>.bps). alttpr.com doesn't let pages on other sites read those
// from the browser, so they come through a small relay the player sets up
// once (relay/worker.js, a free Cloudflare Worker). Everything else happens
// here, the same way alttpr.com's own page builds the ROM in your browser:
// base patch onto your Japanese 1.0 ROM, then the seed, then your cosmetics.

import { md5 } from './md5.js';
import { applyBps } from './bps.js';

const RELAY_KEY = 'unified-kara-relay';
// The relay everyone uses unless they set their own (ROM options).
export const DEFAULT_RELAY = 'https://alttpr-relay.hugecrankhank.workers.dev';

// The player's own relay, if they set one ('' if not).
export function ownRelay() {
  try { return (localStorage.getItem(RELAY_KEY) || '').trim().replace(/\/+$/, ''); } catch (e) { return ''; }
}
export function relayUrl() { return ownRelay() || DEFAULT_RELAY; }
export function setRelayUrl(u) {
  try {
    u = String(u || '').trim().replace(/\/+$/, '');
    if (u) localStorage.setItem(RELAY_KEY, u); else localStorage.removeItem(RELAY_KEY);
  } catch (e) {}
}

// "https://alttpr.com/en/h/AbC123xyZ9", "alttpr.com/h/AbC123xyZ9", or just
// "AbC123xyZ9" (10 letters and digits, with at least one letter) -> the id.
export function alttprId(text) {
  text = String(text || '').trim();
  const m = text.match(/alttpr\.com\/(?:[a-z]{2}\/)?h\/([A-Za-z0-9]{10})\b/);
  if (m) return m[1];
  if (/^[A-Za-z0-9]{10}$/.test(text) && /[A-Za-z]/.test(text)) return text;
  return null;
}

async function getJson(url) {
  const r = await fetch(url);
  if (r.status === 404) throw new Error('alttpr.com has no seed with that id.');
  if (!r.ok) throw new Error(`alttpr.com didn't answer (${r.status}).`);
  const t = await r.text();
  try { return JSON.parse(t); } catch (e) { throw new Error('alttpr.com sent something that isn\'t seed data.'); }
}

/**
 * Fetch an alttpr.com seed: { id, data: {patch, size, spoiler, ...}, baseMd5, bpsPath }.
 * Throws with a readable reason.
 */
export async function fetchAlttprSeed(id) {
  const relay = relayUrl();
  if (!relay) {
    const e = new Error('Loading alttpr.com seeds needs the relay to be set up first (one time). See "alttpr.com relay" under ROM options.');
    e.needsRelay = true;
    throw e;
  }
  let data, base;
  try {
    [data, base] = await Promise.all([getJson(`${relay}/hash/${id}`), getJson(`${relay}/api/h/${id}`)]);
  } catch (e) {
    if (e instanceof TypeError) throw new Error('Couldn\'t reach the relay. Check its address under ROM options.');
    throw e;
  }
  if (!data || !Array.isArray(data.patch)) throw new Error('alttpr.com sent seed data this app doesn\'t understand.');
  return { id, data, baseMd5: String(base.md5 || ''), bpsPath: String(base.bpsLocation || '') };
}

/**
 * The base ROM build a seed needs, from the player's Japanese 1.0 ROM.
 * ownBase: async () => { rom, md5 } for the build this app generates with,
 * used when it's the same build (no download). Other builds' patches are
 * downloaded once and kept.
 */
export async function baseFor(seed, jp, ownBase, kv) {
  const own = await ownBase();
  if (seed.baseMd5 && seed.baseMd5 === own.md5) return own.rom;
  const key = 'bps-' + seed.baseMd5;
  let bps = await kv.get(key).catch(() => null);
  if (!bps) {
    if (!/^\/bps\/[0-9a-f]{32}\.bps$/.test(seed.bpsPath)) throw new Error('alttpr.com didn\'t say which base ROM this seed needs.');
    const r = await fetch(relayUrl() + seed.bpsPath);
    if (!r.ok) throw new Error(`Couldn't download the base patch for this seed (${r.status}).`);
    bps = new Uint8Array(await r.arrayBuffer());
    await kv.set(key, bps).catch(() => {});
  }
  const rom = applyBps(jp, bps);
  if (seed.baseMd5 && md5(rom) !== seed.baseMd5) throw new Error('The base ROM for this seed didn\'t come out right.');
  return rom;
}

/** The seed's patch onto its base ROM (expanded to the seed's size). */
export function patchSeed(base, data) {
  const size = Math.max(base.length, (data.size || 2) * 1024 * 1024);
  const rom = new Uint8Array(size);
  rom.set(base);
  for (const w of data.patch) {
    for (const [off, bytes] of Object.entries(w)) {
      const o = Number(off);
      if (o + bytes.length > rom.length) throw new Error('The seed\'s patch doesn\'t fit its ROM.');
      rom.set(bytes, o);
    }
  }
  return rom;
}
