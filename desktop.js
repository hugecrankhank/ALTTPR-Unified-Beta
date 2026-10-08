/*
 * Desktop layout and pop-out windows.
 *
 * The Desktop layout is the classic one (game on the left, a tracker column
 * on the right). Each of four pieces of the tracker can be popped out into a
 * window of its own, or several into one window:
 *
 *   Items         the items (item tracker)
 *   Dungeons      prize counts, the twelve dungeons, Aga1 / Go Mode
 *   Light World   (map)
 *   Dark World    (map)
 *
 * The game grows into the space pieces leave. Closing a pop-out window, or
 * pressing Dock in it, puts its pieces back in the column.
 *
 * There is still only one item tracker and one map, running in the main
 * window's tracker column (the "engines"); portal.js moves the pieces' live
 * elements into the pop-out windows. So everything stays in step, and popping
 * a piece out or back in never restarts anything. The item tracker uses
 * Hutch's tablet arrangement (?mobile=1, js/mobile.js), which already keeps
 * the items and the dungeons apart.
 *
 * A tracker's menu bars follow its pieces: they stay in the column while any
 * of its pieces is docked, and otherwise go to the window with its first
 * piece (the window's Clean option hides them there).
 *
 * The pop-out windows (popout.html) ask this page once a second which pieces
 * they hold (claim). That is also how they reconnect after this page reloads
 * (a new ROM reloads it), and how a window this page no longer expects closes.
 *
 * Loaded after tablet.js and portal.js, before the main script.
 */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };

  var PIECES = {
    items:    { tracker: 'items', label: 'Items',       sel: '#mob-top', slot: 'fit', order: 0 },
    dungeons: { tracker: 'items', label: 'Dungeons',    sel: '#mob-bot', slot: 'fit', order: 1 },
    light:    { tracker: 'map',   label: 'Light World', sel: '#lw', slot: 'fit', order: 0, chain: ['maps-outer', 'maps'] },
    dark:     { tracker: 'map',   label: 'Dark World',  sel: '#dw', slot: 'fit', order: 1, chain: ['maps-outer', 'maps'] },
  };
  var ORDER = ['items', 'dungeons', 'light', 'dark'];
  var BARS = {
    items: [{ name: 'items-bar', sel: '.tracker-bottom-bar', slot: 'bot', order: 0 }],
    map: [{ name: 'map-top', sel: '#topbar', slot: 'top', order: 0 },
          { name: 'map-bottom', sel: '#bottombar', slot: 'bot', order: 0 }],
  };
  var STATE_KEY = 'unified-kara-windows';  // { place: {piece: id}, wins: {id: tracker} }
  var GEOM_KEY = 'unified-kara-geom-';     // + window id: size and place
  var WIDTH_KEY = 'unified-kara-dock-w';   // width of the tracker column
  var DEFAULT_SIZE = { items: { w: 640, h: 200 }, dungeons: { w: 760, h: 150 }, light: { w: 480, h: 500 }, dark: { w: 480, h: 500 } };

  // A new id for every load of this page; pop-outs use it to notice a reload.
  var pageId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  var active = false;        // Desktop layout on?
  var urls = null;           // { items, map } from the main script
  var place = {};            // piece -> window id, while popped out
  var wins = {};             // window id -> { tracker, win, gone, wait }
  var engines = {};          // 'items' | 'map' -> portal Engine

  // ── remembered windows ─────────────────────────────────────────────────────
  (function restore() {
    var s = null;
    try { s = JSON.parse(localStorage.getItem(STATE_KEY) || 'null'); } catch (e) {}
    if (!s || !s.place || !s.wins) return;
    Object.keys(s.wins).forEach(function (id) {
      // windows that may still be open after this page reloaded get a few
      // seconds to reconnect before their pieces come home
      wins[id] = { tracker: s.wins[id], win: null, gone: 0, wait: Date.now() + 4000 };
    });
    Object.keys(s.place).forEach(function (p) { if (PIECES[p] && wins[s.place[p]]) place[p] = s.place[p]; });
  })();
  function save() {
    var w = {};
    Object.keys(wins).forEach(function (id) { w[id] = wins[id].tracker; });
    try { localStorage.setItem(STATE_KEY, JSON.stringify({ place: place, wins: w })); } catch (e) {}
  }

  function closed(w) { try { return !w || w.closed; } catch (e) { return true; } }
  function piecesIn(id) { return ORDER.filter(function (p) { return place[p] === id; }); }
  function isOut(p) { return active && !!place[p]; }

  // ── the engines ────────────────────────────────────────────────────────────
  var ENGINE_CSS =
    // Hutch's tablet item tracker, in a column: no gap in the middle (that's
    // where his tablet view puts the map), and no −/+ (they size that map).
    'html.mobile #mob-mid{display:none!important}' +
    'html.mobile,html.mobile body{height:auto!important;min-height:0!important}' +
    'html.mobile .tracker-bottom-bar .size-btn{display:none!important}';

  function engineFor(kind) {
    if (!engines[kind] && window.UnifiedPortal) {
      engines[kind] = new window.UnifiedPortal.Engine(kind, kind === 'items' ? $('items-frame') : $('map-frame'));
    }
    return engines[kind];
  }

  // Once the tracker page has laid itself out, find its pieces.
  function resolve(kind, tries) {
    var e = engineFor(kind);
    if (!e || !active) return;
    if (!e.setup()) { if (tries < 60) setTimeout(function () { resolve(kind, tries + 1); }, 100); return; }
    var d = e.doc, DP = e.win.Document.prototype, found = {}, missing = false;
    ORDER.forEach(function (p) {
      if (PIECES[p].tracker !== kind) return;
      var el = DP.querySelector.call(d, PIECES[p].sel);
      if (!el) missing = true;
      found[p] = { name: p, el: el, slot: PIECES[p].slot, chain: PIECES[p].chain, order: PIECES[p].order };
    });
    var bars = BARS[kind].map(function (b) {
      return { name: b.name, el: DP.querySelector.call(d, b.sel), slot: b.slot, order: b.order };
    }).filter(function (b) { return b.el; });
    if (missing) { if (tries < 60) setTimeout(function () { resolve(kind, tries + 1); }, 100); return; }
    if (kind === 'items' && !DP.getElementById.call(d, 'unified-kara-css')) {
      var st = d.createElement('style'); st.id = 'unified-kara-css'; st.textContent = ENGINE_CSS;
      d.head.appendChild(st);
    }
    e.pieces = found; e.bars = bars;
    e.structural = Object.keys(found).map(function (k) { return found[k].el; })
      .concat(bars.map(function (b) { return b.el; }));
    sync();
    // the docked column follows the tracker's own size changes
    try {
      if (e.win.ResizeObserver) new e.win.ResizeObserver(fitDockSoon).observe(d.body);
    } catch (x) {}
  }
  ['items', 'map'].forEach(function (kind) {
    document.addEventListener('DOMContentLoaded', function () {
      var f = kind === 'items' ? $('items-frame') : $('map-frame');
      f.addEventListener('load', function () { if (active) resolve(kind, 0); });
    });
  });

  // ── putting every piece where it belongs ───────────────────────────────────
  function host(id) {
    var r = wins[id];
    if (!r || r.gone || closed(r.win)) return null;
    try { return r.win.UnifiedPortalHost || null; } catch (e) { return null; }
  }
  function portalOf(id) {
    var h = host(id);
    try { return h && h.doc(); } catch (e) { return null; }
  }

  function sync() {
    if (!active) return;
    ['items', 'map'].forEach(function (kind) {
      var e = engines[kind];
      if (!e || !e.pieces || !e.ready()) return;
      var anyDocked = false, first = null;
      ORDER.forEach(function (p) {
        if (PIECES[p].tracker !== kind) return;
        var id = place[p];
        if (!id) { anyDocked = true; e.detach(e.pieces[p]); return; }
        if (!first) first = id;
        var pd = portalOf(id);
        if (!pd) return;                               // its window is still loading
        if (!e.owns(pd) && !e.prepare(pd)) {           // from an older load: reload it
          var h = host(id); if (h) h.reset();
          return;
        }
        e.attach(e.pieces[p], pd);
      });
      // the menu bars follow the pieces
      var barsTo = anyDocked ? null : first, bpd = barsTo && portalOf(barsTo);
      e.bars.forEach(function (b) {
        if (bpd && (e.owns(bpd) || e.prepare(bpd))) e.attach(b, bpd);
        else if (!barsTo) e.detach(b);
      });
    });
    Object.keys(wins).forEach(function (id) {
      var h = host(id);
      if (h) { try { h.changed(info(id)); } catch (x) {} }
    });
    paint();
  }

  // ── windows ────────────────────────────────────────────────────────────────
  function geom(id) {
    var g = null;
    try { g = JSON.parse(localStorage.getItem(GEOM_KEY + id) || 'null'); } catch (e) {}
    var d = DEFAULT_SIZE[id.replace(/-\d+$/, '')] || { w: 600, h: 400 };
    g = g || {};
    var w = Math.max(160, Math.round(g.w || d.w)), h = Math.max(100, Math.round(g.h || d.h));
    var f = 'popup=yes,resizable=yes,width=' + w + ',height=' + h;
    if (typeof g.x === 'number' && typeof g.y === 'number') f += ',left=' + Math.round(g.x) + ',top=' + Math.round(g.y);
    else {
      var i = ORDER.indexOf(id.replace(/-\d+$/, ''));
      f += ',left=' + Math.max(0, (window.screenX || 0) + 80 + 40 * i) + ',top=' + Math.max(0, (window.screenY || 0) + 80 + 40 * i);
    }
    return f;
  }

  function popOut(p) {
    if (!active || !PIECES[p]) return null;
    if (place[p]) { dock(p); return null; }
    var id = p, n = 1;
    while (wins[id]) id = p + '-' + (++n);
    // Must run inside a click: browsers only allow a pop-up from one.
    var w = window.open('popout.html?id=' + encodeURIComponent(id), 'alttpr-desktop-' + id, geom(id));
    if (!w) { blocked(); return null; }
    wins[id] = { tracker: PIECES[p].tracker, win: w, gone: 0, wait: 0 };
    place[p] = id;
    save(); paint();
    try { w.focus(); } catch (e) {}
    return w;
  }

  function dock(p) {
    if (!place[p]) return;
    delete place[p];
    closeEmpty(); save(); sync();
  }

  // Move a piece into window id (from a window's own options), or dock it.
  function move(p, id) {
    if (!PIECES[p]) return;
    if (!id || id === 'dock') return dock(p);
    if (!wins[id] || wins[id].tracker !== PIECES[p].tracker) return;
    place[p] = id;
    closeEmpty(); save(); sync();
  }

  function dockWindow(id) {
    piecesIn(id).forEach(function (p) { delete place[p]; });
    closeEmpty(); save(); sync();
  }

  // Before a window goes: its pieces and any menu or hover card in it come
  // back to the main window, while its page still exists.
  function release(w) {
    var pd = null;
    try { pd = w && !closed(w) && w.UnifiedPortalHost && w.UnifiedPortalHost.doc(); } catch (e) {}
    if (!pd) return;
    ['items', 'map'].forEach(function (kind) {
      var e = engines[kind];
      if (!e || !e.pieces) return;
      ORDER.forEach(function (p) { if (e.pieces[p] && e.where(e.pieces[p]) === pd) e.detach(e.pieces[p]); });
      (e.bars || []).forEach(function (b) { if (b.el && b.el.ownerDocument === pd) e.detach(b); });
      e.rescue(pd);
    });
  }

  function closeEmpty() {
    Object.keys(wins).forEach(function (id) {
      if (piecesIn(id).length) return;
      var r = wins[id];
      release(r.win);
      delete wins[id];
      if (r.win && !closed(r.win)) { try { r.win.close(); } catch (e) {} }
    });
  }

  // A window that's gone for good: its pieces come home.
  function finalize(id) {
    piecesIn(id).forEach(function (p) { delete place[p]; });
    delete wins[id];
    save(); sync();
  }

  setInterval(function () {
    if (!active) return;
    var now = Date.now();
    Object.keys(wins).forEach(function (id) {
      var r = wins[id];
      if (r.win) {
        if (closed(r.win)) finalize(id);
        else if (r.gone && now - r.gone > 4000) finalize(id);
      } else if (r.wait && now > r.wait) finalize(id);
    });
  }, 500);

  function blocked() {
    var n = $('popup-note');
    if (!n) return;
    n.hidden = false;
    clearTimeout(n.__t);
    n.__t = setTimeout(function () { n.hidden = true; }, 9000);
  }

  // What a window holds and could hold, for its options.
  function info(id) {
    var r = wins[id];
    if (!r) return null;
    return {
      key: pageId,
      tracker: r.tracker,
      pieces: ORDER.filter(function (p) { return PIECES[p].tracker === r.tracker; }).map(function (p) {
        return { name: p, label: PIECES[p].label, here: place[p] === id, elsewhere: !!place[p] && place[p] !== id };
      }),
      bars: (function () {
        var e = engines[r.tracker], pd = portalOf(id);
        return !!(e && e.bars && pd && e.bars.some(function (b) { return b.el && b.el.ownerDocument === pd; }));
      })(),
    };
  }

  // ── what the pop-out windows call ──────────────────────────────────────────
  function claim(id, w) {
    if (!active) return null;
    var r = wins[id];
    if (!r || !piecesIn(id).length) return null;
    if (r.win && r.win !== w && !closed(r.win)) return null;   // another window has it
    r.win = w; r.gone = 0; r.wait = 0;
    setTimeout(sync, 0);
    return info(id);
  }
  // The window is closing or reloading: bring its pieces and pop-ups home
  // now, while its page still exists. If it reloads, it claims them back.
  function leaving(id, w) {
    // (also for a window this page has already let go of: whatever is
    // still in it comes home)
    release(w);
    var r = wins[id];
    if (r && r.win === w) r.gone = Date.now();
    paint();
  }
  // The tracker's settings, opened from a window's toolbar.
  function openSettings(id) {
    var r = wins[id], e = r && engines[r.tracker], pd = portalOf(id);
    if (!e || !e.ready()) return;
    if (pd) e.active = { doc: pd, at: Date.now() };
    try {
      if (r.tracker === 'items') e.win.openItemSettings();
      else { var b = e.doc.getElementById('settings-btn'); if (b) b.click(); }
    } catch (x) {}
  }

  // ── the tracker column ─────────────────────────────────────────────────────
  function docked(kind) {
    return ORDER.some(function (p) { return PIECES[p].tracker === kind && !place[p]; });
  }
  // The item tracker's frame gets exactly the height of what's left in it.
  function fitDock() {
    if (!active) return;
    var e = engines.items, wrap = $('items-wrap');
    if (!wrap) return;
    if (!docked('items') || !e || !e.ready()) { wrap.style.height = ''; return; }
    var d = e.doc, h = 0;
    try {
      Array.prototype.forEach.call(d.body.children, function (c) {
        if (/^(SCRIPT|STYLE)$/.test(c.tagName)) return;
        var cs = e.win.getComputedStyle(c);
        // (the bar is pinned to the frame's bottom edge: counted below, as
        // measuring where it sits would grow the frame forever)
        if (cs.display === 'none' || cs.position === 'fixed') return;
        var r = c.getBoundingClientRect();
        if (r.height) h = Math.max(h, r.bottom + e.win.scrollY);
      });
      var bar = d.querySelector('.tracker-bottom-bar');
      if (bar && bar.ownerDocument === d && e.win.getComputedStyle(bar).position === 'fixed') h += bar.offsetHeight;
    } catch (x) {}
    if (h > 0) wrap.style.height = Math.ceil(h + 2) + 'px';
  }
  var dockTimer = null;
  function fitDockSoon() { clearTimeout(dockTimer); dockTimer = setTimeout(fitDock, 60); }
  window.addEventListener('resize', fitDockSoon);

  function paint() {
    var b = document.body;
    ORDER.forEach(function (p) {
      var btn = $('pop-' + p);
      if (!btn) return;
      btn.classList.toggle('on', isOut(p));
      btn.title = isOut(p) ? PIECES[p].label + ' is in its own window. Click to put it back here.'
                           : 'Open ' + PIECES[p].label + ' in its own window';
    });
    var ia = active && !docked('items'), ma = active && !docked('map');
    b.classList.toggle('items-away', ia);
    b.classList.toggle('map-away', ma);
    b.classList.toggle('all-away', ia && ma);
    fitDockSoon();
    // the game and the docked map refit to the new space
    clearTimeout(paint.t);
    paint.t = setTimeout(function () { window.dispatchEvent(new Event('resize')); }, 30);
  }

  function setDockWidth(px) {
    var max = Math.max(300, window.innerWidth - 320);
    px = Math.max(300, Math.min(max, Math.round(px)));
    document.documentElement.style.setProperty('--tracker-w', px + 'px');
    return px;
  }
  function initSplit() {
    var saved = parseFloat(localStorage.getItem(WIDTH_KEY));
    if (!isNaN(saved)) setDockWidth(saved);
    var s = $('dock-split');
    if (!s) return;
    var dragging = false, shield = null, last = null;
    s.addEventListener('pointerdown', function (e) {
      if (!active) return;
      dragging = true; s.setPointerCapture(e.pointerId);
      // the frames would swallow the pointer while it passes over them
      shield = document.createElement('div');
      shield.style.cssText = 'position:fixed;inset:0;z-index:99;cursor:col-resize';
      document.body.appendChild(shield);
      e.preventDefault();
    });
    s.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      last = setDockWidth(window.innerWidth - e.clientX);
      window.dispatchEvent(new Event('resize'));
    });
    function end() {
      if (!dragging) return;
      dragging = false;
      if (shield) { shield.remove(); shield = null; }
      if (last) try { localStorage.setItem(WIDTH_KEY, String(last)); } catch (e) {}
    }
    s.addEventListener('pointerup', end);
    s.addEventListener('pointercancel', end);
    s.addEventListener('dblclick', function () {
      try { localStorage.removeItem(WIDTH_KEY); } catch (e) {}
      document.documentElement.style.removeProperty('--tracker-w');
      window.dispatchEvent(new Event('resize'));
    });
  }

  // ── game only ──────────────────────────────────────────────────────────────
  function gameOnly(on) {
    if (on === undefined) on = !document.body.classList.contains('game-only');
    document.body.classList.toggle('game-only', !!on);
    setTimeout(function () { window.dispatchEvent(new Event('resize')); }, 30);
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && document.body.classList.contains('game-only')) gameOnly(false);
  });

  // ── Hutch's other windows ──────────────────────────────────────────────────
  // His broadcast view (made for stream overlays) and timer. Opened from here,
  // they find the game the same way the trackers do.
  function openExtra(which) {
    var w = null;
    if (which === 'broadcast') {
      var bg = 'black';
      try { bg = localStorage.getItem('alttp-tracker-bg') || 'black'; } catch (e) {}
      w = window.open('tracker/broadcast.html?bg=' + encodeURIComponent(bg), 'alttp-broadcast', 'popup=yes,width=500,height=230,resizable=yes');
    } else if (which === 'timer') {
      w = window.open('tracker/timer.html', 'alttp-timer', 'popup=yes,width=340,height=150,resizable=yes');
    }
    if (!w) blocked();
  }

  // ── loading the trackers ───────────────────────────────────────────────────
  function withMobile(u) { return u + (u.indexOf('?') === -1 ? '?' : '&') + 'mobile=1'; }
  // From tablet.js, whenever new trackers are wanted (a new game, new
  // settings, or switching into Desktop).
  function loadFrames(u) {
    urls = u || urls;
    if (!urls) return;
    $('items-frame').src = withMobile(urls.items);
    $('map-frame').src = urls.map;
  }

  document.addEventListener('DOMContentLoaded', function () {
    ORDER.forEach(function (p) {
      var b = $('pop-' + p);
      if (b) b.addEventListener('click', function () { popOut(p); });
    });
    var g = $('game-only-btn'); if (g) g.addEventListener('click', function () { gameOnly(true); });
    var x = $('exit-game-only'); if (x) x.addEventListener('click', function () { gameOnly(false); });
    var bc = $('open-broadcast'); if (bc) bc.addEventListener('click', function () { openExtra('broadcast'); });
    var tm = $('open-timer'); if (tm) tm.addEventListener('click', function () { openExtra('timer'); });
    initSplit();
    paint();
  });

  window.UnifiedDesktop = {
    // Called by tablet.js whenever the layout changes.
    setActive: function (on) {
      on = !!on;
      if (on === active) return;
      active = on;
      if (!on) {
        // Leaving Desktop: every piece comes home and its window closes.
        place = {};
        Object.keys(wins).forEach(function (id) {
          var r = wins[id];
          release(r.win);
          if (r.win && !closed(r.win)) { try { r.win.close(); } catch (e) {} }
        });
        wins = {}; save();
        document.body.classList.remove('game-only');
        $('items-wrap').style.height = '';
        // (tablet.js then reloads the trackers for the new layout)
      }
      paint();
    },
    active: function () { return active; },
    setUrls: function (u) { urls = u; },
    loadFrames: loadFrames,
    isOut: isOut,
    popOut: popOut,
    dock: dock,
    move: move,
    dockWindow: dockWindow,
    claim: claim,
    leaving: leaving,
    openSettings: openSettings,
    sync: sync,
    gameOnly: gameOnly,
    openExtra: openExtra,
  };
})();
