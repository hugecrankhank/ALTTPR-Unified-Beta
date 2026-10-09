/*
 * Phone layout (iPhone and other phones): one screen, no scrolling.
 *
 *   ┌──────────── emulator ────────────┐
 *   ├ Items / Keys │ Light W. │ Dark W. ┤   ← toggle buttons
 *   │    one tracker panel, fitted      │
 *   └───────────────────────────────────┘
 *
 * Turned sideways, the game sits on the left and the toggles + panel on the right.
 * The header's controls fold behind a ⚙ button; the status pills show as dots.
 *
 * Built on the classic layout's frames (#items-frame, #map-frame), the same way
 * desktop.js is, so the page's own fitting and map dedupe keep working:
 *   Items / Keys → #frames.items-only (fitItems fits it both ways)
 *   Light / Dark → #frames.map-only, with the other world hidden in the map frame
 *                  (fitMap sizes only the worlds showing)
 * Hidden panels stay loaded, so the tracker keeps updating them.
 *
 * Layout → Auto picks Phone on a touch screen whose short side is under 600px;
 * Layout → Phone picks it anywhere. Loaded after tablet.js, before the main script.
 */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var KEY = 'unified-kara-layout';     // tablet.js's layout choice
  var TAB_KEY = 'unified-phone-tab';
  var TABS = [['items', 'Items / Keys'], ['lw', 'Light World'], ['dw', 'Dark World']];
  var on = false, tab = 'items';

  function pref() { try { return localStorage.getItem(KEY) || 'auto'; } catch (e) { return 'auto'; } }
  function touch() {
    try { return !window.matchMedia('(pointer: fine)').matches; } catch (e) { return true; }
  }
  function wanted() {
    var p = pref();
    if (p === 'phone') return true;
    if (p !== 'auto') return false;
    return touch() && Math.min(window.innerWidth, window.innerHeight) < 600;
  }

  // ── the map shows one world at a time ─────────────────────────────────────
  function applyWorld() {
    var d;
    try { d = $('map-frame').contentDocument; } catch (e) { return; }
    if (!d) return;
    var lw = d.getElementById('lw'), dw = d.getElementById('dw');
    if (!lw || !dw) return;
    lw.style.display = on && tab === 'dw' ? 'none' : '';
    dw.style.display = on && tab === 'lw' ? 'none' : '';
  }
  // ── item tracker's bottom bar: buttons big enough for a finger ─────────────
  // Hutch's −/+ (tracker size), ⚙, 📡, ↻ and New Game are 12–18px, and the
  // phone layout scales his tracker down to fit the width, so they were tiny.
  // His own tablet view (js/mobile.js) enlarges them the same way. The page's
  // fitItems counts the bar's height, so it doesn't cover the dungeon row.
  var ITEMS_CSS = [
    '.tracker-bottom-bar { height: auto !important; min-height: 46px; padding: 4px 8px !important; }',
    '.tracker-bottom-bar .size-group { gap: 8px !important; }',
    '.tracker-bottom-bar .size-btn, #item-settings-btn {',
    '  width: 46px !important; height: 38px !important; font-size: 24px !important; line-height: 1 !important;',
    '  padding: 0 !important; border-radius: 6px !important; }',
    '#item-reconnect-btn { width: 46px !important; height: 38px !important; font-size: 24px !important; line-height: 36px !important; }',
    '#item-newgame-btn { height: 38px !important; font-size: 16px !important; line-height: 36px !important; padding: 0 14px !important; }',
    '.connection-status, .mode-label, .race-label { font-size: 13px !important; }'
  ].join('\n');
  function styleItems() {
    var d;
    try { d = $('items-frame').contentDocument; } catch (e) { return; }
    if (!d || !d.head) return;
    var st = d.getElementById('phone-items-css');
    if (on && !st) {
      st = d.createElement('style'); st.id = 'phone-items-css'; st.textContent = ITEMS_CSS;
      d.head.appendChild(st);
    } else if (!on && st) st.remove();
  }

  // ── map Settings panel: fits the frame, scrolls, and closes on a tap ───────
  // Hutch's panel hangs below his ⚙ Settings button with no height limit, so in
  // the phone's map frame it ran off the bottom; and it closes on a mouse click
  // outside it, which a tap on iOS often doesn't produce, so it seemed stuck.
  // On phones the map's own top bar is gone, to give the map that row: its
  // Layout picker does nothing with one world showing, −/+ move to the tab row
  // and Settings to the 🗺 button in the header. Entrance-shuffle seeds keep the
  // bar for Hutch's Connectors / Notes / Checks controls only.
  var MAP_CSS = [
    '#topbar:not(.ent-rows) { display: none !important; }',
    '#topbar > span.tb-label, #layout-sel, #topbar > .tb-sep:not([id]), #topbar > .zoom-btn:not([id]),',
    '#zoom-label, #topbar .tb-break { display: none !important; }',
    '#settings-wrap.phone-floating { position: fixed !important; top: 4px; right: 4px; z-index: 50; margin: 0 !important; }',
    '#settings-wrap.phone-floating #settings-btn { display: none !important; }',
    '#settings-wrap.phone-floating #settings-panel { top: 0 !important; }',
    '#settings-panel { max-height: calc(100vh - 8px); overflow-y: auto; -webkit-overflow-scrolling: touch;',
    '  overscroll-behavior: contain; max-width: calc(100vw - 8px); box-sizing: border-box; }',
    // zoomed in with +, the map can be panned sideways too
    '#maps-outer { overflow-x: auto !important; }',
    '#phone-map-close { display: block; width: 100%; margin: 0 0 8px; padding: 8px; font-size: 14px; font-weight: 600;',
    '  background: #1f6f3a; color: #fff; border: 1px solid #2a8a4a; border-radius: 6px; position: sticky; top: -8px; z-index: 1; }'
  ].join('\n');
  function styleMap() {
    var d;
    try { d = $('map-frame').contentDocument; } catch (e) { return; }
    if (!d || !d.head) return;
    var st = d.getElementById('phone-map-css');
    if (on && !st) {
      st = d.createElement('style'); st.id = 'phone-map-css'; st.textContent = MAP_CSS;
      d.head.appendChild(st);
    } else if (!on && st) st.remove();
    var wrap = d.getElementById('settings-wrap'), topbar = d.getElementById('topbar');
    if (wrap && topbar) {
      if (on && wrap.parentNode !== d.body) { wrap.classList.add('phone-floating'); d.body.appendChild(wrap); }
      else if (!on && wrap.parentNode === d.body) { wrap.classList.remove('phone-floating'); topbar.appendChild(wrap); }
    }
    var panel = d.getElementById('settings-panel'), btn = d.getElementById('settings-btn');
    if (!panel || !btn || d.__phoneMapHooks) return;
    d.__phoneMapHooks = true;
    var isOpen = function () { return panel.classList.contains('open'); };
    // a Close button at the top of the panel (only in the phone layout)
    var close = d.createElement('button');
    close.id = 'phone-map-close'; close.type = 'button'; close.textContent = '\u2715 Close';
    close.addEventListener('click', function (e) { e.stopPropagation(); if (isOpen()) btn.click(); });
    panel.insertBefore(close, panel.firstChild);
    var sync = function () { close.style.display = on ? '' : 'none'; };
    sync(); d.__phoneMapSync = sync;
    // the header's 🗺 button shows whether the panel is open
    try {
      new d.defaultView.MutationObserver(function () {
        var mb = $('phone-map-btn'); if (mb) mb.classList.toggle('on', isOpen());
      }).observe(panel, { attributes: true, attributeFilter: ['class'] });
    } catch (e) {}
    // any tap outside the panel closes it (his own handler listens for the mouse only)
    d.addEventListener('pointerdown', function (e) {
      if (!on || !isOpen()) return;
      if (panel.contains(e.target) || btn.contains(e.target)) return;
      btn.click();
    }, true);
  }

  function refit() {
    // the page's fitItems / fitMap follow window resizes (tablet.js ignores ours)
    setTimeout(function () { window.dispatchEvent(new Event('resize')); }, 0);
  }

  function select(id) {
    tab = TABS.some(function (t) { return t[0] === id; }) ? id : 'items';
    try { localStorage.setItem(TAB_KEY, tab); } catch (e) {}
    var bar = $('phone-tabs');
    if (bar) [].forEach.call(bar.children, function (b) {
      var sel = b.dataset.tab === tab;
      b.classList.toggle('on', sel);
      b.setAttribute('aria-selected', String(sel));
    });
    if (on) $('frames').className = tab === 'items' ? 'items-only' : 'map-only';
    document.body.classList.toggle('phone-map-tab', tab !== 'items');
    applyWorld();
    refit();
  }

  function build() {
    if ($('phone-tabs')) return;
    var bar = document.createElement('div');
    bar.id = 'phone-tabs';
    bar.setAttribute('role', 'tablist');
    TABS.forEach(function (t) {
      var b = document.createElement('button');
      b.type = 'button';
      b.dataset.tab = t[0];
      b.textContent = t[1];
      b.setAttribute('role', 'tab');
      b.addEventListener('click', function () { select(t[0]); });
      bar.appendChild(b);
    });
    // − / + for the map (Hutch's zoom), at the end of the tab row on map tabs
    var zoom = document.createElement('div');
    zoom.id = 'phone-zoom';
    [['\u2212', -1, 'Zoom out'], ['+', 1, 'Zoom in']].forEach(function (z) {
      var zb = document.createElement('button');
      zb.type = 'button'; zb.textContent = z[0]; zb.title = z[2];
      zb.addEventListener('click', function () {
        try { var w = $('map-frame').contentWindow; if (w.changeZoom) w.changeZoom(z[1]); } catch (e) {}
      });
      zoom.appendChild(zb);
    });
    bar.appendChild(zoom);
    var aside = document.querySelector('aside');
    aside.insertBefore(bar, $('frames'));
    // Refit the panel whenever its space changes size for any reason: the ⚙ menu
    // opening and closing (the header grows and shrinks), rotation, the game area.
    // Without this, closing ⚙ left the tracker at its smaller, menu-open size.
    var refitTimer = null;
    if (window.ResizeObserver) new ResizeObserver(function () {
      if (!on) return;
      clearTimeout(refitTimer);
      refitTimer = setTimeout(refit, 50);
    }).observe($('frames'));

    var gear = document.createElement('button');
    gear.id = 'phone-gear';
    gear.type = 'button';
    gear.setAttribute('aria-label', 'Settings');
    gear.setAttribute('aria-expanded', 'false');
    gear.innerHTML = '&#9881;';
    gear.addEventListener('click', function () {
      var open = document.body.classList.toggle('phone-menu');
      gear.setAttribute('aria-expanded', String(open));
    });
    var header = document.querySelector('header');
    // 🗺 Map settings in the header (opens Hutch's map Settings panel)
    var mapBtn = document.createElement('button');
    mapBtn.id = 'phone-map-btn'; mapBtn.type = 'button';
    mapBtn.title = 'Map settings'; mapBtn.setAttribute('aria-label', 'Map settings');
    // a folded-map outline in the header's own colors (not an emoji), + label
    mapBtn.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" ' +
      'stroke="currentColor" stroke-width="1.9" stroke-linejoin="round" stroke-linecap="round">' +
      '<path d="M3 6.5 9 4l6 2.5L21 4v13.5L15 20l-6-2.5L3 20z"/><path d="M9 4v13.5M15 6.5V20"/></svg>' +
      '<span class="map-lbl">Map</span>';
    mapBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      try {
        var d = $('map-frame').contentDocument, b = d.getElementById('settings-btn');
        if (b) b.click();
        mapBtn.classList.toggle('on', d.getElementById('settings-panel').classList.contains('open'));
      } catch (x) {}
    });
    // Reroll, Map, then the status dots, then ⚙
    header.insertBefore(mapBtn, $('pad-status'));
    header.appendChild(gear);
    // the randomizer panel sits between the header (which grows when ⚙ opens)
    // and the tracker toggles, so the toggles stay usable while it's open
    var syncHeader = function () {
      var bs = document.body.style;
      bs.setProperty('--phone-header-h', Math.round(header.getBoundingClientRect().bottom) + 'px');
      bs.setProperty('--phone-tabs-top', Math.round(bar.getBoundingClientRect().top) + 'px');
    };
    if (window.ResizeObserver) {
      var ro = new ResizeObserver(syncHeader);
      ro.observe(header); ro.observe($('game-wrap'));
    }
    window.addEventListener('resize', syncHeader);
    syncHeader();

    var st = document.createElement('style');
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  function apply() {
    var want = wanted();
    if (want === on) return;
    on = want;
    if (on) build();
    document.body.classList.toggle('phone', on);
    document.body.classList.remove('phone-menu');
    styleItems();
    styleMap();
    try { var md = $('map-frame').contentDocument; if (md && md.__phoneMapSync) md.__phoneMapSync(); } catch (e) {}
    if (on) {
      var saved = null;
      try { saved = localStorage.getItem(TAB_KEY); } catch (e) {}
      select(saved || tab);
    } else {
      $('frames').className = '';
      applyWorld();
      refit();
    }
  }

  var CSS = [
    '#phone-tabs, #phone-gear { display: none; }',
    // the page pinned to the screen: header, (randomizer bar), then the game area
    'body.phone { position: fixed; inset: 0; height: auto !important; display: grid !important;',
    '  grid-template-rows: auto auto minmax(0, 1fr); overflow: hidden; overscroll-behavior: none; }',
    'body.phone main { display: grid !important; grid-template-columns: minmax(0, 1fr) !important;',
    '  grid-template-rows: auto minmax(0, 1fr); min-height: 0; grid-row: 3; }',
    // SNES picture is 8:7; full width, but never more than 55% of the height
    'body.phone #game-wrap { width: 100%; aspect-ratio: auto; max-height: none;',
    '  height: min(calc(100vw * 7 / 8), 55dvh); }',
    'body.phone #dock-split, body.phone #exit-game-only, body.phone .tab-pane { display: none !important; }',
    'body.phone aside { width: 100% !important; border-left: 0; border-top: 1px solid var(--line);',
    '  display: flex !important; flex-direction: column; min-height: 0; padding-bottom: env(safe-area-inset-bottom); }',
    'body.phone aside .tabs { display: none !important; }',
    'body.phone #phone-tabs { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)) auto;',
    '  background: var(--panel); border-bottom: 1px solid var(--line); }',
    '#phone-tabs button { min-height: 44px; border: 0; border-radius: 0; background: transparent; color: var(--dim);',
    '  font-size: 15px; border-bottom: 3px solid transparent; touch-action: manipulation; -webkit-tap-highlight-color: transparent; }',
    '#phone-tabs button.on { color: var(--text); border-bottom-color: var(--accent); }',
    '#phone-zoom { display: none; align-items: center; gap: 6px; padding: 0 8px; }',
    'body.phone-map-tab #phone-zoom { display: flex; }',
    '#phone-zoom button { min-height: 36px; min-width: 40px; padding: 0; font-size: 22px; line-height: 1;',
    '  border: 1px solid var(--line); border-radius: 8px; background: #0d1117; color: var(--text); }',
    '#phone-map-btn { display: none; }',
    'body.phone.phone-map-tab #phone-map-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px;',
    '  min-width: 44px; min-height: 34px; padding: 0 10px; color: var(--text); }',
    '#phone-map-btn svg { display: block; flex: none; }',
    '#phone-map-btn.on { border-color: var(--accent); color: var(--accent); background: #12261a; }',
    '@media (max-width: 420px) { body.phone #phone-map-btn .map-lbl { display: none; } }',
    // right-aligned group: Map leads it in Lite (no Reroll); Reroll leads it in Full
    'body.phone.phone-map-tab #phone-map-btn { margin-left: auto; }',
    'body.phone #reroll-btn ~ #phone-map-btn { margin-left: 0 !important; }',
    'body.phone.phone-map-tab #phone-map-btn ~ #phone-gear { margin-left: 0; }',
    'body.phone #frames { display: flex !important; flex-direction: column; flex: 1; min-height: 0; }',
    'body.phone #frames.items-only #items-wrap { flex: 1 !important; height: auto !important; }',
    'body.phone #frames.items-only #map-frame { display: none !important; }',
    'body.phone #frames.map-only #items-wrap { display: none !important; }',
    'body.phone #frames.map-only #map-frame { display: block !important; flex: 1; height: auto !important; min-height: 0; }',
    // header: title, status dots and ⚙; everything else behind the ⚙
    'body.phone:not(.phone-menu) header > :not(h1):not(#pad-status):not(#link-status):not(#phone-gear):not(#reroll-btn):not(#sprite-btn):not(#phone-map-btn) { display: none !important; }',
    // 🎲 Reroll (and the Sprite button, Full) stay in the header next to ⚙
    'body.phone #reroll-btn { margin-left: auto; min-height: 34px; }',
    // narrower phones: 🎲 alone, so the header stays on one line
    '@media (max-width: 420px) { body.phone #reroll-btn .reroll-lbl { display: none; } body.phone #reroll-btn { min-width: 44px; } }',
    'body.phone #reroll-btn ~ #phone-gear { margin-left: 0; }',
    'body.phone #pad-status span, body.phone #link-status span { display: none; }',
    'body.phone header { gap: 8px 12px; padding-top: max(6px, env(safe-area-inset-top)) !important; padding-bottom: 6px; }',
    'body.phone header h1 { font-size: 14px; }',
    'body.phone #phone-gear { display: inline-block; margin-left: auto; min-width: 44px; min-height: 34px; font-size: 18px; }',
    'body.phone-menu #phone-gear { border-color: var(--accent); }',
    // the randomizer bar opens as a panel over the game, under the header, and
    // scrolls inside itself, so it never pushes the tracker off the screen
    'body.phone #rando-bar { position: fixed; z-index: 40; left: 0; right: 0; top: var(--phone-header-h, 56px);',
    '  max-height: calc(var(--phone-tabs-top, 60vh) - var(--phone-header-h, 56px)); overflow-y: auto; -webkit-overflow-scrolling: touch;',
    '  box-shadow: 0 12px 32px rgba(0, 0, 0, .6); }',
    // sideways: game on the left at full height, toggles + panel on the right
    '@media (orientation: landscape) {',
    '  body.phone main { grid-template-columns: auto minmax(0, 1fr) !important; grid-template-rows: minmax(0, 1fr) !important; }',
    '  body.phone #game-wrap { height: 100%; width: min(calc((100dvh - 50px) * 8 / 7), 60vw); }',
    '  body.phone aside { border-top: 0; border-left: 1px solid var(--line); }',
    '  #phone-tabs button { min-height: 36px; font-size: 13px; }',
    '}'
  ].join('\n');

  window.UnifiedPhone = { wanted: wanted, active: function () { return on; } };

  document.addEventListener('DOMContentLoaded', function () {
    apply();
    $('map-frame').addEventListener('load', function () { applyWorld(); styleMap(); refit(); });
    $('items-frame').addEventListener('load', function () { styleItems(); refit(); });
    var sel = $('layout');
    if (sel) sel.addEventListener('change', function () { setTimeout(apply, 0); });
  });
  window.addEventListener('resize', function (e) { if (e.isTrusted !== false) apply(); });
  window.addEventListener('orientationchange', function () { setTimeout(apply, 300); });
})();
