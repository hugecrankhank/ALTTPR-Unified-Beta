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
  // a stalled download must not leave the Sprite button waiting forever
  const ctl = typeof AbortController === 'function' ? new AbortController() : null;
  const t = ctl && setTimeout(() => ctl.abort(), 15000);
  let r;
  try {
    r = await fetch(entry.file, ctl ? { signal: ctl.signal } : undefined);
  } catch (e) {
    throw new Error(`Couldn't download ${entry.name} (${e && e.name === 'AbortError' ? 'timed out' : 'no connection'}).`);
  } finally {
    if (t) clearTimeout(t);
  }
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
 * settles. coll is the sprite collection (collection.js): ★ toggles, your own
 * sprites, and the All / ★ Favorites / Mine views. opts.view opens on a view.
 */
export function openLibrary($, onPick, coll, opts = {}) {
  const dlg = $('sprite-lib'), grid = $('sl-grid'), search = $('sl-search'), tagSel = $('sl-tag'), note = $('sl-note');
  const views = [...dlg.querySelectorAll('.sl-views [data-view]')];
  let view = opts.view || 'all';
  let listOk = !!list;
  dlg.hidden = false;
  document.body.classList.add('modal-open');
  search.value = '';
  setTimeout(() => search.focus(), 0);
  note.textContent = 'Loading the sprite list…';
  grid.innerHTML = '';

  let unsub = null;
  function close() {
    dlg.hidden = true;
    document.body.classList.remove('modal-open');
    document.removeEventListener('keydown', onKey);
    if (unsub) unsub();
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
    note.textContent = entry.own ? `Using ${entry.name}…` : `Downloading ${entry.name}…`;
    Promise.resolve(onPick(entry)).then(close, (e) => {
      note.textContent = String(e.message || e);
    }).finally(() => {
      dlg.classList.remove('busy');
      if (btn) btn.classList.remove('picking');
    });
  }

  // Previews: alttpr.com's picture; offline or missing, drawn from the file
  function preview(s) {
    if (s.own) {
      const c = document.createElement('canvas');
      c.className = 'sl-head-only';
      try { drawHead(parseSprite(s.bytes), c); } catch (e) { /* recolour-only file: blank */ }
      return c;
    }
    const img = document.createElement('img');
    img.loading = 'lazy'; img.decoding = 'async'; img.alt = '';
    img.addEventListener('error', () => {
      coll.cached(s).then((b) => {
        const c = document.createElement('canvas');
        if (b && img.isConnected && drawHead(parseSprite(new Uint8Array(b)), c)) {
          c.className = 'sl-head-only';
          img.replaceWith(c);
        } else previewFallback(s, img);
      }).catch(() => previewFallback(s, img));
    });
    img.src = s.preview;
    return img;
  }

  function cell(s) {
    const key = coll.keyOf(s);
    const wrap = document.createElement('div');
    wrap.className = 'sl-cell' + (s.own ? ' own' : '');
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'sl-item'; b.title = coll.labelOf(s);
    const n = document.createElement('span'); n.className = 'sl-name'; n.textContent = s.name;
    const a = document.createElement('span'); a.className = 'sl-author'; a.textContent = s.own ? (s.author || 'Your file') : s.author;
    b.append(preview(s), n, a);
    b.addEventListener('click', () => pick(s, b));

    const star = document.createElement('button');
    star.type = 'button'; star.className = 'sl-star';
    const paint = () => {
      const on = coll.isFav(key);
      star.textContent = on ? '★' : '☆';
      star.classList.toggle('on', on);
      star.setAttribute('aria-pressed', on ? 'true' : 'false');
      star.setAttribute('aria-label', (on ? 'Unstar ' : 'Star ') + s.name);
      star.title = on ? 'Remove from favourites' : 'Add to favourites (also saved for offline)';
    };
    paint();
    star.addEventListener('click', (e) => {
      e.stopPropagation();
      coll.toggleFav(s).then(() => { paint(); if (view === 'fav') render(); counts(); });
    });
    wrap.append(b, star);

    if (s.own) {
      const del = document.createElement('button');
      del.type = 'button'; del.className = 'sl-del'; del.textContent = '✕';
      del.setAttribute('aria-label', 'Remove ' + s.name);
      del.title = 'Remove from your sprites';
      del.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!confirm(`Remove ${s.name} from your sprites?`)) return;
        coll.removeOwn(key).then(() => { render(); counts(); });
      });
      wrap.appendChild(del);
    }
    return wrap;
  }

  // the view tabs show how many are in each
  function counts() {
    views.forEach((v) => {
      const n = v.dataset.view === 'fav' ? coll.favCount() : v.dataset.view === 'own' ? coll.ownEntries().length : null;
      const c = v.querySelector('.sl-count');
      if (c) c.textContent = n === null ? '' : String(n);
      v.setAttribute('aria-selected', v.dataset.view === view ? 'true' : 'false');
    });
  }

  let renderSeq = 0;
  async function render() {
    const seq = ++renderSeq;
    const q = search.value.trim().toLowerCase(), tag = tagSel.value;
    const lib = list || [];
    let pool;
    if (view === 'fav') pool = await coll.favEntries(lib);
    else if (view === 'own') pool = coll.ownEntries();
    else pool = coll.ownEntries().concat(lib);
    if (seq !== renderSeq) return;   // a newer render started meanwhile
    shown = pool.filter((s) => (!tag || (s.tags || []).includes(tag)) &&
      (!q || s.name.toLowerCase().includes(q) || (s.author || '').toLowerCase().includes(q) ||
       (s.tags || []).some((t) => t.toLowerCase().includes(q))));
    grid.innerHTML = '';
    const frag = document.createDocumentFragment();
    shown.forEach((s) => frag.appendChild(cell(s)));
    grid.appendChild(frag);
    counts();
    if (view === 'fav' && !pool.length) {
      note.textContent = 'No favourites yet. Tap ☆ on any sprite to star it; 🎲★ then rolls only your stars.';
    } else if (view === 'own' && !pool.length) {
      note.textContent = 'No sprites of your own yet. Use + Add files to keep .zspr or .spr files here.';
    } else if (view === 'all' && !listOk) {
      note.textContent = `${shown.length} shown. The alttpr.com list isn't available right now, so only your own sprites are here.`;
    } else {
      const what = view === 'fav' ? 'favourites' : view === 'own' ? 'of your sprites' : 'sprites';
      note.textContent = `${shown.length} ${what} shown. Tap one to use it, ☆ to star it. Random picks from what's shown.`;
    }
  }

  views.forEach((v) => {
    v.onclick = () => { view = v.dataset.view; render(); };
  });

  const add = $('sl-add-input');
  if (add) {
    add.onchange = async () => {
      const files = [...(add.files || [])];
      add.value = '';
      if (!files.length) return;
      let ok = 0, bad = [];
      for (const f of files) {
        try {
          await coll.addOwn(new Uint8Array(await f.arrayBuffer()), f.name.replace(/\.[^.]+$/, ''));
          ok++;
        } catch (e) { bad.push(`${f.name}: ${e.message || e}`); }
      }
      view = 'own';
      await render();
      if (bad.length) note.textContent = `Added ${ok}. Skipped ${bad.join('; ')}`;
      else note.textContent = `Added ${ok} sprite${ok === 1 ? '' : 's'} to your sprites.`;
    };
  }

  search.oninput = render;
  tagSel.onchange = render;
  $('sl-random').onclick = () => {
    if (!shown.length) return;
    pick(shown[Math.floor(Math.random() * shown.length)], null);
  };

  unsub = coll.onChange(counts);
  coll.load().then(() => loadList().then(() => {
    listOk = true;
    if (tagSel.options.length <= 1) {
      const tags = [...new Set(list.flatMap((s) => s.tags))].sort((x, y) => x.localeCompare(y));
      tags.forEach((t) => { const o = document.createElement('option'); o.value = o.textContent = t; tagSel.appendChild(o); });
    }
  }, () => { listOk = false; })).then(render);
}
