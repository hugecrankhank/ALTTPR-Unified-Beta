// The alttpr.com sprite library, browsable in the app.
//
// The list of sprites comes from alttpr.com/sprites. That address doesn't let
// other sites read it from a browser, so the site's deploy step copies it to
// sprites.json here (refreshed weekly; a copy is also kept in the repository
// as a fallback). The sprite files and their previews come straight from
// alttpr.com's file host, which does allow it.

import { parseSprite, drawHead } from './sprite.js';

const LIST_URL = 'sprites.json';
const DIRECT_URL = 'https://alttpr.com/sprites';   // works only where alttpr.com allows it

let list = null;
let loading = null;

export function loadList() {
  if (list) return Promise.resolve(list);
  if (loading) return loading;
  const get = (url) => fetch(url, { cache: 'no-cache' }).then((r) => {
    if (!r.ok) throw new Error(r.status + ' ' + r.statusText);
    return r.json();
  }).then((d) => {
    if (!Array.isArray(d) || !d.length) throw new Error('empty sprite list');
    return d;
  });
  loading = get(LIST_URL).catch(() => get(DIRECT_URL)).then((d) => {
    list = d.filter((s) => s && s.file && s.name).map((s) => ({
      name: String(s.name), author: String(s.author || ''), file: String(s.file),
      preview: String(s.preview || s.file + '.png'), tags: Array.isArray(s.tags) ? s.tags.map(String) : [],
    }));
    return list;
  }).finally(() => { loading = null; });
  return loading;
}

/** Download a sprite file: Uint8Array. */
export async function fetchSprite(entry) {
  const r = await fetch(entry.file);
  if (!r.ok) throw new Error(`Couldn't download ${entry.name} (${r.status}).`);
  return new Uint8Array(await r.arrayBuffer());
}

export function labelOf(entry) { return entry.author ? `${entry.name} by ${entry.author}` : entry.name; }

// The game's own Link: its library file is missing on alttpr's host, and it's
// the default anyway.
export function isPlainLink(entry) { return /\/001\.link\.\d+\.zspr$/.test(entry.file); }

// Some sprites in alttpr.com's list have no preview picture on its file host
// (27 of 513 when this was written). For those, draw the head from the sprite
// file itself, as for your own files.
const drawn = new Map();   // file -> Promise<HTMLCanvasElement|null>
export function previewFallback(entry, img) {
  if (img.__fallback) return;
  img.__fallback = true;
  if (!drawn.has(entry.file)) {
    drawn.set(entry.file, fetchSprite(entry).then((bytes) => {
      const c = document.createElement('canvas');
      return drawHead(parseSprite(bytes), c) ? c : null;
    }).catch(() => null));
  }
  drawn.get(entry.file).then((c) => {
    if (!c || !img.isConnected) return;
    const copy = document.createElement('canvas');
    copy.width = c.width; copy.height = c.height;
    copy.getContext('2d').drawImage(c, 0, 0);
    copy.className = 'sl-head-only';
    copy.title = 'No preview on alttpr.com; drawn from the sprite';
    img.replaceWith(copy);
  });
}

/**
 * The library dialog. onPick(entry) is called with the chosen sprite; it
 * returns a promise, and the dialog stays open (showing progress) until it
 * settles.
 */
export function openLibrary($, onPick) {
  const dlg = $('sprite-lib'), grid = $('sl-grid'), search = $('sl-search'), tagSel = $('sl-tag'), note = $('sl-note');
  dlg.hidden = false;
  document.body.classList.add('modal-open');
  search.value = '';
  setTimeout(() => search.focus(), 0);
  note.textContent = 'Loading the sprite list…';
  grid.innerHTML = '';

  function close() {
    dlg.hidden = true;
    document.body.classList.remove('modal-open');
    document.removeEventListener('keydown', onKey);
  }
  function onKey(e) { if (e.key === 'Escape') close(); }
  document.addEventListener('keydown', onKey);
  $('sl-close').onclick = close;
  dlg.onclick = (e) => { if (e.target === dlg) close(); };

  let shown = [];
  function pick(entry, btn) {
    if (dlg.classList.contains('busy')) return;
    dlg.classList.add('busy');
    if (btn) btn.classList.add('picking');
    note.textContent = `Downloading ${entry.name}…`;
    Promise.resolve(onPick(entry)).then(close, (e) => {
      note.textContent = String(e.message || e);
    }).finally(() => {
      dlg.classList.remove('busy');
      if (btn) btn.classList.remove('picking');
    });
  }
  function render() {
    const q = search.value.trim().toLowerCase(), tag = tagSel.value;
    shown = list.filter((s) => (!tag || s.tags.includes(tag)) &&
      (!q || s.name.toLowerCase().includes(q) || s.author.toLowerCase().includes(q) ||
       s.tags.some((t) => t.toLowerCase().includes(q))));
    grid.innerHTML = '';
    const frag = document.createDocumentFragment();
    shown.forEach((s) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'sl-item'; b.title = labelOf(s);
      const img = document.createElement('img');
      img.loading = 'lazy'; img.decoding = 'async'; img.alt = '';
      img.addEventListener('error', () => previewFallback(s, img));
      img.src = s.preview;
      const n = document.createElement('span'); n.className = 'sl-name'; n.textContent = s.name;
      const a = document.createElement('span'); a.className = 'sl-author'; a.textContent = s.author;
      b.append(img, n, a);
      b.addEventListener('click', () => pick(s, b));
      frag.appendChild(b);
    });
    grid.appendChild(frag);
    note.textContent = `${shown.length} of ${list.length} sprites, from the alttpr.com sprite library. Click one to use it.`;
  }

  loadList().then(() => {
    if (tagSel.options.length <= 1) {
      const tags = [...new Set(list.flatMap((s) => s.tags))].sort((x, y) => x.localeCompare(y));
      tags.forEach((t) => { const o = document.createElement('option'); o.value = o.textContent = t; tagSel.appendChild(o); });
    }
    search.oninput = render;
    tagSel.onchange = render;
    $('sl-random').onclick = () => {
      const from = shown.length ? shown : list;
      pick(from[Math.floor(Math.random() * from.length)], null);
    };
    render();
  }, () => {
    note.textContent = 'The sprite list isn\'t available here. Choose a sprite file instead, or use the published site.';
  });
}
