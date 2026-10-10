/*
 * Hutch's extra windows on iPhone/iPad: the Check List (map → ☑ Checks), the
 * Broadcast view (📡 in the item tracker, or Broadcast in the header) with its
 * Settings and Item Sounds, and the Timer. They open with window.open(). On a
 * computer that's a small window you can close. On iPhone/iPad, and above all
 * in the Home Screen app, it takes over the whole screen with no way back.
 *
 * So on touch screens (and the Home Screen app) they open here instead, as a
 * sheet over the app with a Done button. One opened from a sheet (Broadcast →
 * Settings) stacks on top, and Done goes back to the one under it. They're
 * Hutch's own pages, unchanged, in frames: they talk to the trackers over the
 * same BroadcastChannel and find the game through this page like the trackers.
 * The Items / Dungeons / Light / Dark World pop-outs need real windows, so
 * those buttons are hidden there. Computers keep the windows.
 */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };

  function useSheet() {
    try {
      if (window.navigator.standalone) return true;
      if (window.matchMedia('(display-mode: standalone)').matches) return true;
      return window.matchMedia('(pointer: coarse)').matches;
    } catch (e) { return false; }
  }

  var TITLES = { checklist: 'Check List', broadcast: 'Broadcast', timer: 'Timer',
    'bcast-settings': 'Broadcast Settings', 'bcast-sounds': 'Item Sounds' };
  function which(url) {
    var m = /(?:^|\/)(checklist|broadcast|timer|bcast-settings|bcast-sounds)\.html/i.exec(String(url || ''));
    return m ? m[1].toLowerCase() : null;
  }

  var stack = [];   // open sheets, top last: { key, el }
  var styled = false;
  function style() {
    if (styled) return;
    styled = true;
    var st = document.createElement('style');
    st.textContent = [
      '.ua-sheet { position: fixed; inset: 0; z-index: 200; display: flex; flex-direction: column; background: #111; }',
      '.ua-sheet .cs-bar { flex: none; display: flex; align-items: center; justify-content: space-between; gap: 12px;',
      '  padding: max(8px, env(safe-area-inset-top)) max(12px, env(safe-area-inset-right)) 8px max(12px, env(safe-area-inset-left));',
      '  background: var(--panel, #161b22); border-bottom: 1px solid var(--line, #2a313c); color: var(--text, #e6e9ee); font-size: 15px; }',
      '.ua-sheet .cs-done { min-width: 72px; min-height: 38px; font-size: 15px; font-weight: 600;',
      '  color: var(--accent, #5fbf6f); border-color: var(--accent, #5fbf6f); }',
      '.ua-sheet iframe { flex: 1; width: 100%; border: 0; background: #111;',
      '  padding-bottom: env(safe-area-inset-bottom); box-sizing: border-box; }',
      // pop-outs that move parts of the trackers need real windows
      'html.touch-sheets #pop-items, html.touch-sheets #pop-dungeons,',
      'html.touch-sheets #pop-light, html.touch-sheets #pop-dark { display: none !important; }',
    ].join('\n');
    document.head.appendChild(st);
  }

  function open(url) {
    style();
    var key = which(url) || url;
    // already open: bring it to the top
    for (var i = 0; i < stack.length; i++) {
      if (stack[i].key === key) {
        var s = stack.splice(i, 1)[0];
        stack.push(s);
        document.body.appendChild(s.el);
        if (s.frame.getAttribute('src') !== url) s.frame.src = url;
        return;
      }
    }
    var el = document.createElement('div');
    el.className = 'ua-sheet';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', TITLES[key] || '');
    el.innerHTML = '<div class="cs-bar"><b></b><button type="button" class="cs-done">Done</button></div><iframe></iframe>';
    el.querySelector('b').textContent = TITLES[key] || '';
    var f = el.querySelector('iframe');
    f.title = TITLES[key] || '';
    var entry = { key: key, el: el, frame: f };
    f.addEventListener('load', function () {
      hookWin(f.contentWindow);
      // his pages' own ✕ / Close call window.close(): close this sheet
      try { f.contentWindow.close = function () { closeSheet(entry); }; } catch (e) {}
    });
    el.querySelector('.cs-done').addEventListener('click', function () { closeSheet(entry); });
    f.src = url;
    document.body.appendChild(el);
    stack.push(entry);
    el.querySelector('.cs-done').focus({ preventScroll: true });
  }

  function closeSheet(s) {
    var i = stack.indexOf(s);
    if (i < 0) return;
    stack.splice(i, 1);
    s.el.remove();
    if (!stack.length) window.dispatchEvent(new Event('resize'));
  }
  function closeTop() { if (stack.length) closeSheet(stack[stack.length - 1]); }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && stack.length) closeTop(); });

  // A stand-in for the window the caller asked for, so code that checks it
  // ("blocked?", focus) carries on.
  var fake = { closed: false, focus: function () {}, close: closeTop, postMessage: function () {} };

  // wrap window.open: this page's (header Broadcast, Timer), the trackers'
  // (📡, ☑ Checks) each time they load, and each sheet's (Settings, Sounds)
  function hookWin(w) {
    if (!w || w.__sheetHooked) return;
    try {
      var orig = w.open;
      w.open = function (url) {
        if (useSheet() && which(url)) {
          open(new URL(url, w.location.href).href);
          return fake;
        }
        return orig.apply(w, arguments);
      };
      w.__sheetHooked = true;
    } catch (e) {}
  }
  // every tracker frame (classic, tablet/stacked, phone), each time it loads
  hookWin(window);
  document.addEventListener('load', function (e) {
    var fr = e.target;
    if (fr && fr.tagName === 'IFRAME' && !fr.closest('.ua-sheet')) hookWin(fr.contentWindow);
  }, true);
  document.addEventListener('DOMContentLoaded', function () {
    [].forEach.call(document.querySelectorAll('iframe'), function (fr) { hookWin(fr.contentWindow); });
    style();
    document.documentElement.classList.toggle('touch-sheets', useSheet());
  });
  window.UnifiedSheet = { open: open, close: closeTop };
})();
