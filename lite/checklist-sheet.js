/*
 * Hutch's map → ☑ Checks opens his Check List with window.open(). On a computer
 * that's a small window you can close. On iPhone/iPad, and above all in the
 * Home Screen app, it takes over the whole screen with no way back.
 *
 * So on touch screens (and the Home Screen app) the Check List opens here
 * instead, as a sheet over the app with a Done button. It's Hutch's own page,
 * unchanged, in a frame: it talks to the map over the same BroadcastChannel,
 * so ticking checks off still works both ways. Computers keep his window.
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

  var sheet = null;
  function build() {
    sheet = document.createElement('div');
    sheet.id = 'checklist-sheet';
    sheet.hidden = true;
    sheet.setAttribute('role', 'dialog');
    sheet.setAttribute('aria-label', 'Check List');
    sheet.innerHTML = '<div class="cs-bar"><b>Check List</b>' +
      '<button type="button" class="cs-done">Done</button></div><iframe title="Check List"></iframe>';
    sheet.querySelector('.cs-done').addEventListener('click', close);
    document.body.appendChild(sheet);
    var st = document.createElement('style');
    st.textContent = [
      '#checklist-sheet { position: fixed; inset: 0; z-index: 200; display: flex; flex-direction: column; background: #111; }',
      '#checklist-sheet[hidden] { display: none; }',
      '#checklist-sheet .cs-bar { flex: none; display: flex; align-items: center; justify-content: space-between; gap: 12px;',
      '  padding: max(8px, env(safe-area-inset-top)) max(12px, env(safe-area-inset-right)) 8px max(12px, env(safe-area-inset-left));',
      '  background: var(--panel, #161b22); border-bottom: 1px solid var(--line, #2a313c); color: var(--text, #e6e9ee); font-size: 15px; }',
      '#checklist-sheet .cs-done { min-width: 72px; min-height: 38px; font-size: 15px; font-weight: 600;',
      '  color: var(--accent, #5fbf6f); border-color: var(--accent, #5fbf6f); }',
      '#checklist-sheet iframe { flex: 1; width: 100%; border: 0; background: #111;',
      '  padding-bottom: env(safe-area-inset-bottom); box-sizing: border-box; }',
    ].join('\n');
    document.head.appendChild(st);
  }

  function open(url) {
    if (!sheet) build();
    var f = sheet.querySelector('iframe');
    if (f.getAttribute('src') !== url) f.src = url;
    sheet.hidden = false;
    sheet.querySelector('.cs-done').focus({ preventScroll: true });
  }
  function close() {
    if (!sheet || sheet.hidden) return;
    sheet.hidden = true;
    window.dispatchEvent(new Event('resize'));
  }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });

  // wrap the map frame's window.open, each time it loads
  function hook() {
    var fr = $('map-frame');
    var w = fr && fr.contentWindow;
    if (!w || w.__checklistHooked) return;
    try {
      var orig = w.open;
      w.open = function (url, name, features) {
        if (useSheet() && /checklist\.html/i.test(String(url || ''))) {
          open(new URL(url, w.location.href).href);
          return null;
        }
        return orig.apply(w, arguments);
      };
      w.__checklistHooked = true;
    } catch (e) {}
  }

  document.addEventListener('DOMContentLoaded', function () {
    var fr = $('map-frame');
    if (!fr) return;
    fr.addEventListener('load', hook);
    hook();
  });
  window.UnifiedChecklist = { open: open, close: close };
})();
