/*
 * Right-click on touch screens: press and hold.
 *
 * Hutch's trackers put a lot behind right-click: notes and connectors on map
 * checks, prizes, keys and item counts in the item tracker. iPhone/iPad never
 * send a right-click (contextmenu), so holding a finger on something here
 * sends one for it, at that spot, and the tap that ends the hold doesn't also
 * count as a tap. A finger that moves (scrolling, panning) doesn't count.
 * Android already sends contextmenu on a hold, so only one of the two is used.
 *
 * Added to the tracker frames from outside; Hutch's pages are unchanged.
 */
(function () {
  'use strict';
  var HOLD_MS = 450, SLOP = 10;

  function attach(win) {
    var doc;
    try { doc = win && win.document; } catch (e) { return; }
    if (!doc || win.__longPress) return;
    win.__longPress = true;

    var timer = null, start = null, target = null;
    var firedAt = 0, nativeDuringPress = false;

    function cancel() { clearTimeout(timer); timer = null; start = null; target = null; }

    doc.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'touch' || !e.isPrimary) return;
      cancel();
      nativeDuringPress = false;
      start = { x: e.clientX, y: e.clientY };
      target = e.target;
      timer = setTimeout(function () {
        var t = target, s = start;
        cancel();
        if (!t || nativeDuringPress) return;
        firedAt = Date.now();
        var ev = new win.MouseEvent('contextmenu', {
          bubbles: true, cancelable: true, view: win, button: 2, buttons: 2,
          clientX: s.x, clientY: s.y, screenX: s.x, screenY: s.y,
        });
        ev.__unifiedLongPress = true;
        t.dispatchEvent(ev);
      }, HOLD_MS);
    }, true);

    doc.addEventListener('pointermove', function (e) {
      if (!start || e.pointerType !== 'touch') return;
      if (Math.abs(e.clientX - start.x) > SLOP || Math.abs(e.clientY - start.y) > SLOP) cancel();
    }, true);
    doc.addEventListener('pointerup', cancel, true);
    doc.addEventListener('pointercancel', cancel, true);

    // Android: its own contextmenu during the hold wins; one right after ours is dropped
    doc.addEventListener('contextmenu', function (e) {
      if (e.__unifiedLongPress) return;
      if (timer) { nativeDuringPress = true; cancel(); return; }
      if (Date.now() - firedAt < 1000) { e.preventDefault(); e.stopImmediatePropagation(); }
    }, true);

    // the tap that ends a hold isn't a tap (nor the mouse events the browser
    // makes up for it, which would close the menu that just opened)
    ['click', 'mousedown', 'mouseup'].forEach(function (t) {
      doc.addEventListener(t, function (e) {
        if (Date.now() - firedAt < 800) { e.preventDefault(); e.stopImmediatePropagation(); }
      }, true);
    });

    // no iOS text selection / "Copy" bubble while holding (typing boxes keep theirs)
    try {
      var st = doc.createElement('style');
      st.textContent = '@media (pointer: coarse) { body *:not(input):not(textarea):not([contenteditable]) {' +
        ' -webkit-touch-callout: none; -webkit-user-select: none; user-select: none; } }';
      (doc.head || doc.documentElement).appendChild(st);
    } catch (e) {}
  }

  // every tracker frame (classic, tablet/stacked, phone), each time it loads
  function isTracker(fr) { return /(^|\/)tracker\//.test(fr.src || fr.getAttribute('src') || ''); }
  document.addEventListener('load', function (e) {
    var fr = e.target;
    if (fr && fr.tagName === 'IFRAME' && isTracker(fr)) attach(fr.contentWindow);
  }, true);
  document.addEventListener('DOMContentLoaded', function () {
    [].forEach.call(document.querySelectorAll('iframe'), function (fr) {
      if (isTracker(fr) && fr.contentDocument && fr.contentDocument.readyState !== 'loading') attach(fr.contentWindow);
    });
  });
})();
