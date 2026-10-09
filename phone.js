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
    'body.phone #phone-tabs { display: grid; grid-auto-flow: column; grid-auto-columns: 1fr;',
    '  background: var(--panel); border-bottom: 1px solid var(--line); }',
    '#phone-tabs button { min-height: 44px; border: 0; border-radius: 0; background: transparent; color: var(--dim);',
    '  font-size: 15px; border-bottom: 3px solid transparent; touch-action: manipulation; -webkit-tap-highlight-color: transparent; }',
    '#phone-tabs button.on { color: var(--text); border-bottom-color: var(--accent); }',
    'body.phone #frames { display: flex !important; flex-direction: column; flex: 1; min-height: 0; }',
    'body.phone #frames.items-only #items-wrap { flex: 1 !important; height: auto !important; }',
    'body.phone #frames.items-only #map-frame { display: none !important; }',
    'body.phone #frames.map-only #items-wrap { display: none !important; }',
    'body.phone #frames.map-only #map-frame { display: block !important; flex: 1; height: auto !important; min-height: 0; }',
    // header: title, status dots and ⚙; everything else behind the ⚙
    'body.phone:not(.phone-menu) header > :not(h1):not(#pad-status):not(#link-status):not(#phone-gear):not(#reroll-btn) { display: none !important; }',
    // 🎲 Reroll stays in the header next to ⚙
    'body.phone #reroll-btn { margin-left: auto; min-height: 34px; }',
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
    $('map-frame').addEventListener('load', function () { applyWorld(); refit(); });
    $('items-frame').addEventListener('load', function () { styleItems(); refit(); });
    var sel = $('layout');
    if (sel) sel.addEventListener('change', function () { setTimeout(apply, 0); });
  });
  window.addEventListener('resize', function (e) { if (e.isTrusted !== false) apply(); });
  window.addEventListener('orientationchange', function () { setTimeout(apply, 300); });
})();
