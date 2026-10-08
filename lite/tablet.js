/*
 * Tablet layout (iPad landscape and other wide screens), built on Hutch's own
 * tablet view (his mobile.html + tracker/js/mobile.js):
 *
 *   ┌──────────────── items (two rows) ───────────────┐
 *   │ Light World map │     emulator     │ Dark World map │
 *   └──────────────── twelve dungeons ─────────────────┘
 *
 * Hutch's version does the hard part. Opened with ?mobile=1:
 *   - the item tracker lays itself out as the top and bottom bands, leaves the
 *     middle empty and posts {type:'mobile-mid', top, height} to its parent;
 *   - the map tracker hides its bars and shows Light World left, Dark World
 *     right, with a gap between them kept free for the game.
 * The gap is resizable while playing with the −/+ buttons in the item
 * tracker's bottom bar (stored as 'alttp-mobile-gap'), and the map refits.
 *
 * This file does what his mobile.html does (puts the map in the middle band)
 * and one thing more: it puts the emulator in the gap between the two maps,
 * and follows the gap whenever it changes.
 *
 * Portrait layout (iPad held upright): the game on top, then the items and
 * dungeons (Hutch's tablet item tracker, sized to its contents, no middle
 * band), then both maps side by side across the full width with their menu
 * bars hidden:
 *
 *   ┌────────────── emulator ──────────────┐
 *   ├──────── items + dungeons ────────────┤
 *   │ Light World map  │  Dark World map   │
 *   └──────────────────┴───────────────────┘
 *
 * Turned sideways, the same layout puts the maps in a column on the right
 * (Light World over Dark World), with the game and items + dungeons on the left.
 *
 * Loaded before the main script, which hands it the tracker URLs.
 */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var KEY = 'unified-kara-layout';
  var GAP_KEY = 'alttp-mobile-gap';   // Hutch's key (js/mobile.js)
  var on = null;           // 'tablet', 'portrait' or false (classic); null until first load
  var urls = null;
  var mid = null;          // the middle band the item tracker last reported

  function pref() {
    var p = 'auto';
    try { p = localStorage.getItem(KEY) || 'auto'; } catch (e) {}
    return p === 'portrait' ? 'stacked' : p;   // its first name
  }
  // A mouse or trackpad as the main pointer: a desktop or laptop, where Auto
  // means the Desktop layout. Touch screens keep the tablet layouts.
  function finePointer() {
    try { return window.matchMedia('(pointer: fine)').matches; } catch (e) { return false; }
  }
  // Desktop (desktop.js) is the classic layout plus pop-out windows, so for
  // this file it is the classic layout (wantMode false).
  function wantDesktop() {
    if (!window.UnifiedDesktop) return false;   // editions without pop-outs (Lite)
    var p = pref();
    if (p === 'desktop') return true;
    return p === 'auto' && finePointer() && window.innerWidth > 900;
  }
  function wantMode() {
    var p = pref(), W = window.innerWidth, H = window.innerHeight;
    if (p === 'tablet') return p;
    if (p === 'stacked') return 'portrait';
    // Phone (phone.js) is built on the classic frames, so for this file it's classic
    if (p === 'classic' || p === 'desktop' || p === 'phone') return false;
    if (window.UnifiedPhone && window.UnifiedPhone.wanted()) return false;
    if (wantDesktop()) return false;
    if (W >= 1000 && W > H) return 'tablet';
    if (W >= 700 && H > W) return 'portrait';
    return false;
  }

  // ── scale the tracker bands to use spare height ───────────────────────────
  // On a 4:3 screen (iPad Pro 12.9 at 1366x1024) the maps and game run out of
  // width long before height, which left empty bands above and below them.
  // So the item tracker is laid out at a smaller virtual size and scaled up by
  // k: the items, dungeons and buttons all get bigger, and the middle band
  // shrinks to the height the maps and game actually use.
  var k = 1, lastT = null, lastB = null, tries = 0;
  var K_MAX = 1.6;
  function gapShare() {
    var g = 0.34;
    try { var v = parseFloat(localStorage.getItem(GAP_KEY)); if (!isNaN(v)) g = v; } catch (e) {}
    return g;
  }
  function size() { var f = $('tab-full'); return { W: f.clientWidth, H: f.clientHeight }; }
  function applyK() {
    var f = $('tab-items'), z = size();
    if (!z.W || !z.H) return;
    f.style.width = (z.W / k) + 'px';
    f.style.height = (z.H / k) + 'px';
    f.style.transformOrigin = '0 0';
    f.style.transform = k === 1 ? '' : 'scale(' + k + ')';
  }
  function retune() {
    if (on !== 'tablet' || lastT === null || tries > 6) return;
    var z = size();
    if (!z.W || !z.H) return;
    // what the middle needs: the maps at their width-limited size, and the
    // game (4:3) in the gap they leave
    var each = z.W * (1 - gapShare()) / 2;
    var gameW = Math.max(0, z.W - 2 * each - 2 * MARGIN);
    var need = Math.max(each, gameW * 3 / 4) + 8;
    var kt = (z.H - need) / (lastT + lastB);
    kt = Math.max(1, Math.min(K_MAX, kt));
    if (Math.abs(kt - k) > 0.02) { k = kt; tries++; applyK(); }
  }
  function resetTune() { tries = 0; retune(); }

  // ── the map goes in the band the item tracker leaves empty ────────────────
  // ── the item tracker's settings menu ───────────────────────────────────────
  // Hutch's tracker says when its Tracker Settings open (mobile-settings). The
  // map and the game lie over parts of the item tracker's page, so while the
  // menu is open the map steps aside (as in his mobile.html) and the item
  // tracker comes to the front, full screen, so every tap reaches the menu.
  var settingsOpen = false;
  function showSettings(open) {
    settingsOpen = !!open;
    $('tab-map').style.visibility = settingsOpen ? 'hidden' : '';
    $('tab-items').style.zIndex = settingsOpen ? '3' : '';
    if (on === 'portrait') placePortrait();
  }

  window.addEventListener('message', function (e) {
    if (!on || !e.data) return;
    if (e.source !== $('tab-items').contentWindow) return;
    if (e.data.type === 'mobile-settings') { showSettings(e.data.open); return; }
    if (e.data.type !== 'mobile-mid') return;
    if (on === 'portrait') { portraitMid(e.data.height); return; }
    var Hv = size().H / k;
    lastT = e.data.top; lastB = Math.max(0, Hv - e.data.top - e.data.height);
    mid = { top: Math.round(e.data.top * k), height: Math.max(0, Math.round(e.data.height * k)) };
    var m = $('tab-map');
    m.style.top = mid.top + 'px';
    m.style.height = mid.height + 'px';
    placeGameSoon();
    retune();
  });

  // ── the game goes in the gap between the two maps ─────────────────────────
  var MARGIN = 6;          // breathing room between the game and each map
  function placeGame() {
    if (on === 'portrait') { placePortrait(); return; }
    if (!on || !mid) return;
    var gw = $('game-wrap'), f = $('tab-map'), d;
    try { d = f.contentDocument; } catch (e) { return; }
    var lw = d && d.getElementById('lw'), dw = d && d.getElementById('dw');
    var left, right;
    if (lw && dw && lw.offsetWidth) {
      left = lw.getBoundingClientRect().right + MARGIN;
      right = dw.getBoundingClientRect().left - MARGIN;
    } else {
      // map not laid out yet: fall back to Hutch's own sum
      var W = f.clientWidth, H = mid.height, g = 0.34;
      try { var v = parseFloat(localStorage.getItem(GAP_KEY)); if (!isNaN(v)) g = v; } catch (e) {}
      var each = Math.floor(Math.min(H, W * (1 - g) / 2));
      left = each + MARGIN; right = W - each - MARGIN;
    }
    var w = Math.max(0, Math.floor(right - left));
    // The emulator letterboxes the SNES picture inside this box, so the game
    // keeps its shape whatever size the gap is.
    gw.style.left = Math.round(left) + 'px';
    gw.style.top = mid.top + 'px';
    gw.style.width = w + 'px';
    gw.style.height = mid.height + 'px';
    if (gw.__lastW !== w || gw.__lastH !== mid.height) {
      gw.__lastW = w; gw.__lastH = mid.height;
      // the emulator canvas follows its container; nudge it
      window.dispatchEvent(new Event('resize'));
    }
  }
  var placeTimer = null;
  function placeGameSoon() { clearTimeout(placeTimer); placeTimer = setTimeout(placeGame, 40); }

  function clearGame() {
    var gw = $('game-wrap');
    ['left', 'top', 'width', 'height'].forEach(function (k) { gw.style[k] = ''; });
    gw.__lastW = gw.__lastH = null;
    ['tab-items', 'tab-map'].forEach(function (id) {
      ['left', 'top', 'width', 'height', 'transform'].forEach(function (k) { $(id).style[k] = ''; });
    });
  }

  // ── portrait ───────────────────────────────────────────────────────────────
  var itemsH = 400;        // height of the items + dungeons band, tuned to fit
  var MAP_GAP = 4;         // between the two maps
  function portraitMid(midH) {
    if (settingsOpen) return;   // the frame is full screen for the menu just now
    // Hutch's item tracker leaves a middle band for the map; here there is
    // none, so shrink the frame until that band is gone.
    if (midH > 2) { itemsH = Math.max(120, Math.round(itemsH - midH + 1)); placePortrait(); }
  }
  // Upright: maps side by side across the bottom. Landscape: maps stacked in
  // a column on the right, with the game and the items + dungeons on the left.
  function sideMaps(z) { return z.W > z.H; }
  function mapEach(z) {
    return sideMaps(z) ? Math.floor(Math.min((z.H - MAP_GAP) / 2, z.W * 0.42))
                       : Math.floor(Math.min((z.W - MAP_GAP) / 2, z.H * 0.45));
  }
  function placePortrait() {
    var z = size();
    if (!z.W || !z.H) return;
    var each = mapEach(z), side = sideMaps(z);
    var colW = side ? z.W - each - MAP_GAP : z.W;              // game + items column
    var gameH = Math.max(120, z.H - itemsH - (side ? 0 : each));
    var it = $('tab-items'), m = $('tab-map'), gw = $('game-wrap');
    it.style.transform = ''; it.style.left = '0px'; it.style.top = gameH + 'px';
    it.style.width = colW + 'px'; it.style.height = itemsH + 'px';
    if (side) {
      m.style.left = (colW + MAP_GAP) + 'px'; m.style.top = '0px';
      m.style.width = each + 'px'; m.style.height = z.H + 'px';
    } else {
      m.style.left = '0px'; m.style.top = (gameH + itemsH) + 'px';
      m.style.width = z.W + 'px'; m.style.height = each + 'px';
    }
    gw.style.left = '0px'; gw.style.top = '0px'; gw.style.width = colW + 'px'; gw.style.height = gameH + 'px';
    if (settingsOpen) {   // menu open: the item tracker takes the whole screen for now
      it.style.top = '0px'; it.style.width = z.W + 'px'; it.style.height = z.H + 'px';
    }
    fitPortraitMap();
    if (gw.__lastW !== colW || gw.__lastH !== gameH) {
      gw.__lastW = colW; gw.__lastH = gameH;
      window.dispatchEvent(new Event('resize'));
    }
  }
  var PORTRAIT_MAP_CSS =
    'html,body{background:#000!important;overflow:hidden!important}' +
    '#topbar,#bottombar{display:none!important}' +
    '#maps-outer{padding:0!important;margin:0!important;height:100vh!important;display:flex!important;' +
    'align-items:center;justify-content:center;overflow:hidden!important}' +
    '#maps{display:flex!important;gap:' + MAP_GAP + 'px!important;margin:0!important}' +
    '#settings-wrap{position:fixed!important;top:4px;right:4px;z-index:50}' +
    '#settings-panel{max-height:calc(100vh - 40px);overflow-y:auto}';
  var PORTRAIT_ITEMS_CSS =
    // the −/+ size the maps in the landscape layout; nothing to size here
    '.tracker-bottom-bar .size-btn{display:none!important}';
  function inject(frame, id, css) {
    try {
      var d = frame.contentDocument;
      if (!d || !d.head) return;
      var st = d.getElementById(id);
      if (!st) { st = d.createElement('style'); st.id = id; d.head.appendChild(st); }
      st.textContent = css;
    } catch (e) {}
  }
  function fitPortraitMap() {
    // Delayed calls from Stacked (300 / 1000 ms after the map loads) must not
    // resize the Tablet map after a switch: that left the game no room.
    if (on !== 'portrait') return;
    var f = $('tab-map'), d, w;
    try { d = f.contentDocument; w = f.contentWindow; } catch (e) { return; }
    if (!d || !d.getElementById('maps')) return;
    var z = size(), each = mapEach(z);
    d.getElementById('maps').style.flexDirection = sideMaps(z) ? 'column' : 'row';
    d.querySelectorAll('.map-wrap').forEach(function (el) { el.style.width = el.style.height = each + 'px'; });
    var pct = each / 5.12;   // markers shrink with the map below 100%, as Hutch does
    d.documentElement.style.setProperty('--mk', pct < 100 ? (pct / 100).toFixed(3) : '1');
    // keep his own zoom and window sizing from undoing this
    w.applyZoom = fitPortraitMap; w.resizeWindowToMap = function () {};
  }
  function setupPortraitFrame(f, which) {
    if (which === 'map') {
      inject(f, 'unified-portrait-css', PORTRAIT_MAP_CSS);
      try {
        var d = f.contentDocument, sw = d.getElementById('settings-wrap');
        if (sw && sw.parentNode !== d.body) d.body.appendChild(sw);
      } catch (e) {}
      fitPortraitMap(); setTimeout(fitPortraitMap, 300); setTimeout(fitPortraitMap, 1000);
    } else {
      inject(f, 'unified-portrait-css', PORTRAIT_ITEMS_CSS);
    }
  }

  // ── the map's Settings, from the header ───────────────────────────────────
  // The map's own Settings button sat on top of the map and covered a check,
  // so it's hidden and the header's "Map settings" button opens the same
  // menu. The menu itself still opens in the map's top-right corner.
  var MAP_SETTINGS_CSS =
    '#settings-btn{display:none!important}' +
    '#settings-wrap,#settings-wrap.mob-settings{top:0!important;right:4px!important}';
  function mapDoc() { try { return $('tab-map').contentDocument; } catch (e) { return null; } }
  function syncMapSettingsBtn() {
    var d = mapDoc(), p = d && d.getElementById('settings-panel');
    var b = $('map-settings-btn');
    if (b) b.classList.toggle('open', !!(p && p.classList.contains('open')));
  }
  function hookMapSettings(f) {
    inject(f, 'unified-map-settings-css', MAP_SETTINGS_CSS);
    try {
      var p = f.contentDocument.getElementById('settings-panel');
      if (p && f.contentWindow.MutationObserver) {
        new f.contentWindow.MutationObserver(syncMapSettingsBtn).observe(p, { attributes: true, attributeFilter: ['class'] });
      }
    } catch (e) {}
    syncMapSettingsBtn();
  }
  document.addEventListener('DOMContentLoaded', function () {
    var b = $('map-settings-btn');
    if (b) b.addEventListener('click', function (e) {
      e.stopPropagation();
      var d = mapDoc(), sb = d && d.getElementById('settings-btn');
      if (sb) sb.click();
    });
  });

  // ── frame setup ────────────────────────────────────────────────────────────
  function setupFrames() {
    $('tab-items').addEventListener('load', function () {
      if (on === 'portrait') setupPortraitFrame(this, 'items');
    });
    $('tab-map').addEventListener('load', function () {
      if (!on) return;
      var f = this;
      try { if (window.UnifiedApp && window.UnifiedApp.installMapDedupe) window.UnifiedApp.installMapDedupe(f.contentWindow); } catch (e) {}
      hookMapSettings(f);
      if (on === 'portrait') { setupPortraitFrame(f, 'map'); return; }
      try {
        var w = f.contentWindow;
        // follow the maps whenever Hutch refits them (gap −/+, rotation, band size)
        var watch = function () {
          var lw = w.document.getElementById('lw');
          if (lw && w.ResizeObserver) new w.ResizeObserver(placeGameSoon).observe(lw);
        };
        setTimeout(watch, 200);
        w.addEventListener('resize', placeGameSoon);
      } catch (e) {}
      setTimeout(placeGame, 120); setTimeout(placeGame, 900);
    });
  }

  function withMobile(u) { return u + (u.indexOf('?') === -1 ? '?' : '&') + 'mobile=1'; }

  function load() {
    if (!urls) return;
    var blank = 'about:blank';
    mid = null; lastT = lastB = null; tries = 0; k = 1; itemsH = 400;
    settingsOpen = false; $('tab-map').style.visibility = ''; $('tab-items').style.zIndex = '';
    if (on === 'tablet') applyK(); else if (on === 'portrait') placePortrait();
    if (on) {
      $('items-frame').src = blank;
      $('map-frame').src = blank;
      $('tab-items').src = withMobile(urls.items);
      // portrait sizes the maps itself; Hutch's mobile map keeps a gap for the game
      $('tab-map').src = on === 'portrait' ? urls.map : withMobile(urls.map);
    } else {
      ['tab-items', 'tab-map'].forEach(function (id) { $(id).src = blank; });
      // Desktop (desktop.js) loads them its own way.
      var D = window.UnifiedDesktop;
      if (D && D.active()) D.loadFrames(urls);
      else { $('items-frame').src = urls.items; $('map-frame').src = urls.map; }
    }
  }

  var desk = false;
  function syncDesktop(t) {
    var d = !t && wantDesktop(), changed = d !== desk;
    desk = d;
    document.body.classList.toggle('desktop', d);
    if (window.UnifiedDesktop) window.UnifiedDesktop.setActive(d);
    return changed;
  }

  function apply(force) {
    var t = wantMode();
    // Classic <-> Desktop is the same layout here, but Desktop loads the
    // item tracker in Hutch's tablet arrangement, so the trackers reload.
    var deskChanged = syncDesktop(t);
    if (t === on && !force) { if (deskChanged && urls) load(); placeGameSoon(); return; }
    on = t;
    clearGame();
    document.body.classList.toggle('tablet', !!on);
    document.body.classList.toggle('portrait', on === 'portrait');
    load();
    setTimeout(function () { window.dispatchEvent(new Event('resize')); }, 120);
  }

  window.UnifiedTablet = {
    active: function () { return !!on; },
    setUrls: function (u) {
      urls = u;
      if (window.UnifiedDesktop) window.UnifiedDesktop.setUrls(u);
      if (on === null) apply(true); else load();
    },
    setPref: function (p) { try { localStorage.setItem(KEY, p); } catch (e) {} apply(false); },
    pref: pref,
    fit: placeGame,
  };

  setupFrames();
  // the randomizer bar opening/closing changes the space the layout gets
  if (window.ResizeObserver) document.addEventListener('DOMContentLoaded', function () {
    var full = $('tab-full');
    if (full) new ResizeObserver(function () {
      if (on === 'tablet') { applyK(); resetTune(); placeGameSoon(); }
      else if (on === 'portrait') placePortrait();
    }).observe(full);
  });
  // the gap −/+ in the item tracker writes this key; follow it here too
  window.addEventListener('storage', function (e) { if (e.key === GAP_KEY) { placeGameSoon(); resetTune(); } });
  window.addEventListener('resize', function (e) {
    // ignore the resize events we send the emulator ourselves
    if (e && e.isTrusted === false) return;
    if (on === null) return;
    apply(false);
    if (on === 'tablet') { applyK(); resetTune(); }
    else if (on === 'portrait') { itemsH = 400; placePortrait(); }
  });
  window.addEventListener('orientationchange', function () { setTimeout(function () { apply(false); }, 300); });
})();
