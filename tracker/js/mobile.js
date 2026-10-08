// Mobile / tablet layout (mobile.html, Chris, Oct 2026). Loaded by the item
// tracker and the map; does nothing unless the page was opened with ?mobile=1.
//
//   item tracker  → prize counts, heart, CHECKS and every item in two rows
//                   across the top; the twelve dungeons in a row along the
//                   bottom; the middle left empty (mobile.html lays the map
//                   over it). Reports the middle's position to the parent.
//   map           → no bars; Light World on the left, Dark World on the right,
//                   an empty gap between them for the game, sized to fit.
(function () {
  var q = new URLSearchParams(location.search);
  if (q.get('mobile') !== '1') return;
  document.documentElement.classList.add('mobile');
  // Read by js/items.js while it builds the tracker (this file loads first):
  // every dungeon in the tall layout.
  window._mobileLayout = true;

  // The map's size, as the share of the width kept free for the game in the
  // middle. Set by the item tracker's −/+ buttons, read by the map; shared
  // through storage so the two frames stay in step.
  var GAP_KEY = 'alttp-mobile-gap';
  function getGap() {
    var v = null;
    try { v = parseFloat(localStorage.getItem(GAP_KEY)); } catch (e) {}
    if (!isNaN(v) && v !== null) return v;
    return parseFloat(q.get('gap')) || 0.34;
  }

  var css = document.createElement('style');
  css.textContent = [
    'html.mobile, html.mobile body { margin:0; height:100%; overflow:hidden; }',
    // ── item tracker ──
    'html.mobile body.mob-items { display:flex; flex-direction:column; zoom:1 !important;',
    '  padding:0 !important; box-sizing:border-box; }',
    '#mob-top, #mob-bot { flex:0 0 auto; display:flex; flex-direction:column; align-items:center;',
    '  align-self:stretch; width:100%; }',
    '#mob-bot .mob-row { align-items:flex-end; }',
    // Dungeons centred on the screen; the counts pinned left, Aga1 / Go Mode
    // pinned right.
    '#mob-bot .mob-botrow { position:relative; width:100%; justify-content:center; }',
    '#mob-bot .mob-counts, #mob-bot .mob-side { display:flex; align-items:center; gap:2px; }',
    '#mob-bot .mob-counts { position:absolute; left:4px; top:50%; transform:translateY(-50%); }',
    '#mob-bot .mob-side { position:absolute; right:4px; top:50%; transform:translateY(-50%); }',
    '#mob-bot .mob-dungeons { display:flex; justify-content:center; align-items:flex-end; }',
    // Narrow screens: counts left and Aga1 / Go Mode right on a line of their
    // own, the dungeons centred underneath.
    '#mob-bot .mob-botrow.stack { flex-wrap:wrap; }',
    '#mob-bot .mob-botrow.stack .mob-counts, #mob-bot .mob-botrow.stack .mob-side { position:static; transform:none; order:0; }',
    '#mob-bot .mob-botrow.stack .mob-counts { margin-right:auto; padding-left:4px; }',
    '#mob-bot .mob-botrow.stack .mob-side { padding-right:4px; }',
    '#mob-bot .mob-botrow.stack .mob-dungeons { order:1; flex-basis:100%; }',
    '#mob-top .mob-row, #mob-bot .mob-row { display:flex; align-items:center; justify-content:center; }',
    '#mob-top .mob-items { flex-wrap:wrap; }',
    '#mob-mid { flex:1 1 auto; }',
    '#mob-bot .dungeon-slot { width:auto !important; margin:0 2px; }',
    'html.mobile .tracker-container { display:none !important; }',
    // The map-size −/+ in the bottom bar, big enough for a finger.
    'html.mobile .tracker-bottom-bar { height:auto !important; min-height:32px; box-sizing:border-box; }',
    'html.mobile .tracker-bottom-bar .size-btn, html.mobile #item-settings-btn {',
    '  width:34px; height:28px; font-size:18px; line-height:1; margin-right:4px; padding:0; }',
    // Reset and New Game the same height as the rest, for a finger.
    'html.mobile #item-reconnect-btn { width:34px; height:28px; font-size:18px; line-height:26px; }',
    'html.mobile #item-newgame-btn { height:28px; font-size:14px; line-height:26px; padding:0 12px; margin-left:4px; }',
    // The emulator sits over the middle, and another app's window can't be
    // drawn under, so Tracker Settings open on the left, over the Light World.
    'html.mobile #item-settings-overlay { justify-content:flex-start; align-items:center; padding-left:8px; box-sizing:border-box; }',
    'html.mobile #item-settings-overlay .its-modal { max-width:calc(50vw - 24px); }',
    // No broadcast view on the tablet.
    'html.mobile #item-broadcast-btn { display:none !important; }',
    // ── map ──
    'html.mobile #topbar, html.mobile #bottombar { display:none !important; }',
    'html.mobile #maps-outer { overflow:hidden !important; background:transparent !important; }',
    'html.mobile body.mob-map { background:transparent !important; }',
    '#settings-wrap.mob-settings { position:fixed; top:4px; right:4px; z-index:50; }',
    '#settings-wrap.mob-settings #settings-panel { max-height:calc(100vh - 40px); overflow-y:auto; }',
    'html.mobile #maps { display:flex !important; flex-direction:row !important; width:100%;',
    '  justify-content:space-between; align-items:center; height:100%; }'
  ].join('\n');
  document.head.appendChild(css);

  function onReady(fn) {
    if (document.readyState === 'complete') setTimeout(fn, 50);
    else window.addEventListener('load', function () { setTimeout(fn, 50); });
  }

  // ── The item tracker ──────────────────────────────────────────────────────
  if (document.querySelector('script[src*="js/items.js"]')) {
    onReady(function () {
      var tc = document.querySelector('.tracker-container');
      if (!tc) return;
      document.body.classList.add('mob-items');
      // The desktop layout lines boxes up by measuring them; here it would
      // fight the new rows, so it stands down.
      window.equalizeTopBoxes = function () {};
      window.equalizeCrystalRow = function () {};
      document.querySelectorAll('[style*="width"]').forEach(function (e) {
        if (e.closest('.tracker-container')) e.style.width = '';
      });

      var top = document.createElement('div'); top.id = 'mob-top';
      var mid = document.createElement('div'); mid.id = 'mob-mid';
      var bot = document.createElement('div'); bot.id = 'mob-bot';
      var bar = document.querySelector('.tracker-bottom-bar');
      document.body.insertBefore(top, bar || null);
      document.body.insertBefore(mid, bar || null);
      document.body.insertBefore(bot, bar || null);

      // The items on top, split evenly over two rows. The count row (crystals,
      // pendants, heart, CHECKS) goes to the bottom, left of the dungeons.
      var tiles = [], counts = [];
      tc.querySelectorAll('.tracker-row').forEach(function (row) {
        var isCount = row.classList.contains('count-row');
        Array.prototype.slice.call(row.children).forEach(function (c) {
          if (c.classList.contains('dungeon-slot') || c.classList.contains('stats-slot')) return;
          (isCount ? counts : tiles).push(c);
        });
      });
      // Agahnim 1 and Go Mode go to the bottom right, balancing the counts.
      var side = tiles.filter(function (t) {
        var img = t.querySelector && t.querySelector('img');
        return t.classList.contains('go-mode') || (img && /\/aga1\d\.png/.test(img.getAttribute('src') || ''));
      });
      tiles = tiles.filter(function (t) { return side.indexOf(t) === -1; });
      // The items: one row when there's room, wrapping onto a second (evenly)
      // rather than shrinking when there isn't (Chris, Oct 2026).
      var trow = document.createElement('div'); trow.className = 'mob-row mob-items';
      tiles.forEach(function (t) { trow.appendChild(t); });
      top.appendChild(trow);

      // The bottom row: the counts on one line at the far left, then the
      // dungeons, in Chris's order, centred in the rest.
      var brow = document.createElement('div'); brow.className = 'mob-row mob-botrow';
      var cgrp = document.createElement('div'); cgrp.className = 'mob-counts';
      counts.forEach(function (c) { cgrp.appendChild(c); });
      brow.appendChild(cgrp);
      var dgrp = document.createElement('div'); dgrp.className = 'mob-dungeons';
      brow.appendChild(dgrp);
      var sgrp = document.createElement('div'); sgrp.className = 'mob-side';
      side.forEach(function (t) { sgrp.appendChild(t); });
      brow.appendChild(sgrp);
      ['hc','ep','dp','toh','pod','sp','sw','tt','ip','mm','tr','gt'].forEach(function (k) {
        var d = document.querySelector('.dungeon-slot[data-dungeon-key="' + k + '"]');
        if (d) dgrp.appendChild(d);
      });
      bot.appendChild(brow);

      // Fit the rows to the screen width, then tell mobile.html where the
      // empty middle is so it can put the map there.
      function fit() {
        // The status bar is pinned to the bottom edge; keep the dungeons above it.
        bot.style.marginBottom = (bar ? bar.offsetHeight + 2 : 0) + 'px';
        // Items: as many even rows as it takes to stay full size.
        trow.style.maxWidth = 'none'; trow.style.flexWrap = 'nowrap';
        var itemsW = trow.scrollWidth, avail = innerWidth - 8;
        var rows = Math.max(1, Math.ceil(itemsW / avail));
        trow.style.flexWrap = 'wrap';
        trow.style.maxWidth = rows > 1 ? Math.ceil(itemsW / rows + 48) + 'px' : 'none';

        // Bottom: dungeons always centred on the screen, the counts and
        // Aga1 / Go Mode pinned either side; the row shrinks just enough for
        // the sides to clear the dungeons.
        // If that would take it under 80%, the sides move up onto their own
        // line above the dungeons instead, so nothing gets small.
        bot.style.zoom = 1;
        brow.classList.remove('stack');
        var dW = dgrp.offsetWidth, cW = cgrp.offsetWidth, sW = sgrp.offsetWidth;
        var need = dW / 2 + Math.max(cW, sW) + 16;
        var z = Math.min(1, innerWidth / 2 / need);
        if (z < 0.8) {
          brow.classList.add('stack');
          z = Math.min(1, innerWidth / (dW + 8), innerWidth / (cW + sW + 24));
        }
        bot.style.zoom = z < 1 ? z.toFixed(3) : 1;
        // The gap left for the status bar is inside the zoomed row, so it's
        // scaled back up to stay a true bar's height.
        bot.style.marginBottom = ((bar ? bar.offsetHeight + 2 : 0) / Math.min(1, z)).toFixed(1) + 'px';
        var r = mid.getBoundingClientRect();
        if (parent !== window) parent.postMessage({ type: 'mobile-mid', top: r.top, height: r.height }, '*');
      }
      addEventListener('resize', fit);
      fit(); setTimeout(fit, 300);

      // The map lies over the middle of this page, so while the item tracker's
      // settings are open it has to step aside or it swallows every tap.
      var ov = document.getElementById('item-settings-overlay');
      if (ov && parent !== window) {
        var tell = function () {
          parent.postMessage({ type: 'mobile-settings', open: !ov.classList.contains('hidden') }, '*');
        };
        new MutationObserver(tell).observe(ov, { attributes: true, attributeFilter: ['class'] });
        tell();
      }

      // The bottom bar's −/+ resize the maps here, not the item tracker.
      window.changeTrackerScale = function (delta) {
        var g = Math.min(0.8, Math.max(0, getGap() - (delta > 0 ? 0.04 : -0.04)));
        try { localStorage.setItem(GAP_KEY, g.toFixed(2)); } catch (e) {}
      };
    });
  }

  // ── The map ───────────────────────────────────────────────────────────────
  if (document.getElementById('maps')) {
    onReady(function () {
      document.body.classList.add('mob-map');
      function fit() {
        var each = Math.floor(Math.min(innerHeight, innerWidth * (1 - getGap()) / 2));
        document.querySelectorAll('.map-wrap').forEach(function (el) {
          el.style.width = el.style.height = each + 'px';
        });
        // Markers shrink with the map below full size, as on the desktop.
        var pct = each / 5.12;
        document.documentElement.style.setProperty('--mk', pct < 100 ? (pct / 100).toFixed(3) : '1');
      }
      // The desktop zoom would resize the maps (and try to resize the window).
      window.applyZoom = fit;
      window.resizeWindowToMap = function () {};
      addEventListener('resize', fit);
      addEventListener('storage', function (e) { if (e.key === GAP_KEY) fit(); });
      fit();

      // The map's own settings menu, out of the hidden top bar and into the
      // top-right corner.
      var sw = document.getElementById('settings-wrap');
      if (sw) {
        document.body.appendChild(sw);
        sw.classList.add('mob-settings');
      }
    });
  }
})();
