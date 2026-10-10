// Your sprite collection: ★ favourites and your own sprite files, kept in this
// browser (the same IndexedDB store as the base ROM and current sprite).
//
// Nothing here is uploaded anywhere. The library list itself stays on
// alttpr.com's host (library.js); the collection only remembers which sprites
// you starred, plus:
//   - your own .zspr/.spr files (about 30 KB each), so they show up in the
//     library and in rolls like any other sprite;
//   - a copy of each starred library sprite's file, downloaded once when you
//     star it, so 🎲★ works with no connection (Full's offline mode).
//
// Storage keys in the 'kv' store:
//   'sprite-favs'        array of sprite keys
//   'sprite-own'         array of { key, name, author, label, bytes, added }
//   'sprite-cache:<key>' Uint8Array, a starred library sprite's file

import { parseSprite } from './sprite.js';
import { fetchSprite, labelOf, isPlainLink } from './library.js';

/**
 * A stable key for a sprite. Library files are named like "abigail.1.zspr";
 * the number is the sprite's version, so it's left out and a starred sprite
 * stays starred when its author updates it.
 */
export function keyOf(entry) {
  if (entry.key) return entry.key;
  const base = String(entry.file || '').split('/').pop().replace(/(\.\d+)?\.zspr$/i, '');
  return 'lib:' + base.toLowerCase();
}

// FNV-1a over the file: the same file added twice is one sprite
function hashBytes(b) {
  let h = 0x811c9dc5;
  for (let i = 0; i < b.length; i++) { h ^= b[i]; h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(16).padStart(8, '0') + '-' + b.length.toString(16);
}

export function createCollection({ kvGet, kvSet, kvDel }) {
  let favs = null;     // Set of keys
  let own = null;      // array of own-sprite records
  let ready = null;
  const listeners = new Set();

  function load() {
    if (ready) return ready;
    ready = Promise.all([
      kvGet('sprite-favs').catch(() => null),
      kvGet('sprite-own').catch(() => null),
    ]).then(([f, o]) => {
      favs = new Set(Array.isArray(f) ? f : []);
      own = Array.isArray(o) ? o.filter((r) => r && r.key && r.bytes) : [];
    });
    return ready;
  }
  const changed = () => listeners.forEach((fn) => { try { fn(); } catch (e) { console.warn(e); } });
  const saveFavs = () => kvSet('sprite-favs', [...favs]);
  const saveOwn = () => kvSet('sprite-own', own);

  // A grid/roll entry for one of your own sprites
  function ownEntry(r) {
    return { key: r.key, own: true, name: r.name, author: r.author, label: r.label, bytes: r.bytes, tags: ['Mine'] };
  }

  async function cacheLibrary(entry) {
    if (isPlainLink(entry)) return;   // the game's own Link needs no file
    const k = 'sprite-cache:' + keyOf(entry);
    if (await kvGet(k).catch(() => null)) return;
    const bytes = await fetchSprite(entry);
    parseSprite(bytes);
    if (favs.has(keyOf(entry))) await kvSet(k, bytes.slice());
  }

  return {
    load,
    /** fn() runs after any change (star, add, remove). Returns an unsubscribe. */
    onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },

    isFav(key) { return !!favs && favs.has(key); },
    favCount() { return favs ? favs.size : 0; },

    /** Star or unstar. Returns the new state. */
    async toggleFav(entry) {
      await load();
      const key = keyOf(entry);
      if (favs.has(key)) {
        favs.delete(key);
        await saveFavs();
        kvDel('sprite-cache:' + key).catch(() => {});
        changed();
        return false;
      }
      favs.add(key);
      await saveFavs();
      changed();
      // keep a copy for offline rolls; a failed download just means it's
      // fetched the next time it's rolled instead
      if (!entry.own && entry.file) cacheLibrary(entry).catch((e) => console.warn('[sprites] not cached:', e));
      return true;
    },

    /** Your own sprites, newest first. */
    ownEntries() { return own ? own.slice().reverse().map(ownEntry) : []; },

    /** Add a sprite file to your collection. Returns its entry (an existing one if it's a duplicate). */
    async addOwn(bytes, fileName) {
      await load();
      const info = parseSprite(bytes);   // throws with a readable reason
      const key = 'own:' + hashBytes(bytes);
      const dup = own.find((r) => r.key === key);
      if (dup) return ownEntry(dup);
      const name = info.name || fileName || 'My sprite';
      const author = info.author || '';
      const r = { key, name, author, label: author ? `${name} by ${author}` : name, bytes: bytes.slice(), added: Date.now() };
      own.push(r);
      await saveOwn();
      changed();
      return ownEntry(r);
    },

    async removeOwn(key) {
      await load();
      own = own.filter((r) => r.key !== key);
      await saveOwn();
      if (favs.delete(key)) await saveFavs();
      changed();
    },

    /** The sprite file for an entry: yours, the offline copy, or a download. */
    async bytesFor(entry) {
      if (entry.own) return entry.bytes;
      const k = 'sprite-cache:' + keyOf(entry);
      const hit = await kvGet(k).catch(() => null);
      if (hit && hit.length) return new Uint8Array(hit);
      const bytes = await fetchSprite(entry);
      if (favs && favs.has(keyOf(entry))) kvSet(k, bytes.slice()).catch(() => {});
      return bytes;
    },

    /** An offline copy, if there is one (for drawing previews offline). */
    cached(entry) {
      if (entry.own) return Promise.resolve(entry.bytes);
      return kvGet('sprite-cache:' + keyOf(entry)).catch(() => null);
    },

    /**
     * Starred sprites as entries, from the library list plus your own.
     * Starred library sprites that have left alttpr.com's list still roll
     * from their offline copy.
     */
    async favEntries(list) {
      await load();
      const byKey = new Map((list || []).map((e) => [keyOf(e), e]));
      own.forEach((r) => byKey.set(r.key, ownEntry(r)));
      const out = [];
      for (const k of favs) {
        if (byKey.has(k)) { out.push(byKey.get(k)); continue; }
        const b = await kvGet('sprite-cache:' + k).catch(() => null);
        if (b && b.length) {
          try {
            const info = parseSprite(b);
            const name = info.name || k.replace(/^lib:/, '');
            out.push({ key: k, own: true, name, author: info.author || '', label: info.author ? `${name} by ${info.author}` : name, bytes: new Uint8Array(b), tags: [] });
          } catch (e) { /* damaged copy: skip */ }
        }
      }
      return out;
    },

    labelOf(entry) { return entry.label || labelOf(entry); },
    keyOf,
  };
}

/** A random entry from pool, avoiding the current one when there's a choice. */
export function pickFrom(pool, currentKey) {
  if (!pool.length) return null;
  const others = pool.length > 1 ? pool.filter((e) => keyOf(e) !== currentKey) : pool;
  return others[Math.floor(Math.random() * others.length)];
}
