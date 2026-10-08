/*
 * portal.js — one tracker, shown in several windows.
 *
 * Hutch's tracker is built around a single item tracker and a single map.
 * Running a second copy to show one part of it elsewhere doesn't work: his
 * autotracking applies only what changed in game memory since its last read,
 * so two copies that are ever a moment out of step can disagree for good, and
 * each would send the map its own idea of the items.
 *
 * So there is only ever one of each, running in the main window (an
 * "engine"). To show a part of it (a "piece": the items, the dungeons, a
 * world of the map) in another window, the piece's live elements are moved
 * into that window's page (portal.html). They keep their own click handlers,
 * and the engine keeps updating them, because it holds them by reference.
 *
 * Moving them out needs four things that this file provides:
 *
 *   Lookups. The tracker finds its elements with document.getElementById and
 *   document.querySelector(All). Those are widened on the engine's document
 *   to also search the pieces that are elsewhere.
 *
 *   Looks. The engine's stylesheets, and the classes and inline styles on its
 *   <html> and <body>, are copied to each portal page and kept current. The
 *   containers a piece sat in (the map's #maps-outer and #maps) are recreated
 *   around it, with their classes kept in step, so its CSS still applies.
 *
 *   Page-level listeners. Handlers the tracker put on document or window
 *   (close a menu on an outside click, the dungeon hover card, hotkeys) are
 *   added to each portal page too. bridge/sni-shim.js records them as the
 *   tracker registers them.
 *
 *   Menus and pop-ups. A menu, tooltip, hover card or settings panel the
 *   tracker opens is a child of its own <body> or <html>. When one appears
 *   just after you used a piece in another window, it moves to that window
 *   (and back again when you next use it from the main window).
 *
 * Nothing in the tracker itself is changed.
 */
(function () {
  'use strict';

  // Page-level events worth passing on to the tracker from a portal.
  var FORWARD = ['click', 'dblclick', 'auxclick', 'contextmenu', 'mousedown', 'mouseup', 'mousemove',
    'mouseover', 'mouseout', 'pointerdown', 'pointerup', 'pointermove', 'pointerover', 'pointerout',
    'wheel', 'keydown', 'keyup', 'keypress', 'touchstart', 'touchend', 'touchmove'];
  // Events that say which window you're using right now.
  var ACTIVE = ['pointerdown', 'mousedown', 'contextmenu', 'click', 'mouseover', 'keydown', 'wheel'];

  var gens = 0;

  // Layout of a portal page. Pieces sit in #p-fit, which the pop-out window
  // sizes and centres; a tracker's menu bars go in #p-top / #p-bot.
  var PORTAL_CSS = {
    common:
      '#p-root{position:fixed!important;inset:0!important;display:flex!important;flex-direction:column!important;' +
      'margin:0!important;padding:0!important;overflow:hidden!important}' +
      '#p-top,#p-bot{flex:0 0 auto!important;position:relative!important;width:100%!important}' +
      '#p-stage{flex:1 1 auto!important;position:relative!important;overflow:hidden!important;min-height:0!important}' +
      '#p-fit{position:absolute!important;left:0;top:0;transform-origin:0 0;width:max-content}',
    // Item tracker pieces (Hutch's tablet arrangement, js/mobile.js): the
    // items, then a row of counts, dungeons and Aga1 / Go Mode.
    items:
      '#p-fit{display:flex!important;flex-direction:column!important;align-items:center!important;gap:6px}' +
      '#p-fit>#mob-top,#p-fit>#mob-bot{width:auto!important;margin:0!important;zoom:1!important;align-self:center!important}' +
      '#p-fit #mob-top .mob-items{max-width:var(--prow,none)!important;flex-wrap:wrap!important}' +
      '#p-fit #mob-bot .mob-botrow{position:static!important;width:auto!important;flex-wrap:nowrap!important;' +
      'justify-content:center!important;align-items:center!important;gap:8px!important}' +
      '#p-fit #mob-bot .mob-counts,#p-fit #mob-bot .mob-side{position:static!important;transform:none!important;' +
      'order:0!important;margin:0!important;padding:0!important}' +
      '#p-fit #mob-bot .mob-dungeons{order:0!important;flex-basis:auto!important}' +
      '#p-bot .tracker-bottom-bar{position:static!important;width:100%!important;left:auto!important;bottom:auto!important}',
    // Map pieces: the worlds, at the size the window sets in --psize.
    map:
      '#p-fit>[data-u-mirror="maps-outer"]{flex:none!important;padding:0!important;margin:0!important;' +
      'overflow:visible!important;height:auto!important;width:auto!important;background:transparent!important;display:block!important}' +
      '#p-fit [data-u-mirror="maps"]{display:flex!important;flex-direction:row!important;gap:12px!important;margin:0!important}' +
      '#p-root[data-arr="stack"] #p-fit [data-u-mirror="maps"]{flex-direction:column!important}' +
      '#p-fit #lw,#p-fit #dw{width:var(--psize,512px)!important;height:var(--psize,512px)!important}' +
      '#p-top #topbar,#p-bot #bottombar{position:relative!important}',
  };

  function Engine(kind, frame) {
    this.kind = kind;          // 'items' | 'map'
    this.frame = frame;
    this.win = null;
    this.doc = null;
    this.gen = 0;              // changes with every load of the tracker page
    this.portals = [];         // portal documents in use
    this.active = { doc: null, at: 0 };
    this.structural = [];      // elements that are never treated as pop-ups
  }

  Engine.prototype.ready = function () {
    try { return !!(this.doc && this.doc === this.frame.contentDocument && this.win.__unifiedReady); }
    catch (e) { return false; }
  };

  // Called whenever the engine's tracker page has loaded.
  Engine.prototype.setup = function () {
    var w, d;
    try { w = this.frame.contentWindow; d = this.frame.contentDocument; } catch (e) { return false; }
    if (!w || !d || !d.body || w.location.href === 'about:blank') return false;
    if (this.doc === d && w.__unifiedReady) return true;
    this.win = w; this.doc = d;
    this.gen = ++gens;
    // The pieces belonged to the page that's gone; until the new ones are
    // found (desktop.js), there's nothing to place.
    this.pieces = null; this.bars = []; this.structural = [];
    this.portals = [];
    this.active = { doc: d, at: 0 };
    w.__unifiedRoots = [];
    patchLookups(w);
    var self = this;
    this.trackActive(d);
    this.observeOverlays(d);
    // listeners the tracker adds from now on reach the portals too
    w.__unifiedOnListener = function (kind, type, fn, opts, add) {
      if (FORWARD.indexOf(type) < 0) return;
      self.portals.forEach(function (pd) { forwardOne(pd, kind, type, fn, opts, add); });
    };
    // keep the portals' copies of the styles and of <html>/<body> current
    var styleTimer = null;
    new w.MutationObserver(function () {
      clearTimeout(styleTimer);
      styleTimer = setTimeout(function () { self.portals.forEach(function (pd) { self.copyStyles(pd); }); }, 40);
    }).observe(d.head, { childList: true, subtree: true, characterData: true, attributes: true });
    new w.MutationObserver(function () {
      self.portals.forEach(function (pd) { self.copyRootAttrs(pd); });
    }).observe(d.documentElement, { attributes: true, attributeFilter: ['class', 'style'] });
    new w.MutationObserver(function () {
      self.portals.forEach(function (pd) { self.copyRootAttrs(pd); });
    }).observe(d.body, { attributes: true, attributeFilter: ['class', 'style'] });
    w.__unifiedReady = true;
    return true;
  };

  Engine.prototype.alive = function (pd) {
    try { return !!(pd && pd.defaultView && !pd.defaultView.closed && pd.documentElement.isConnected); }
    catch (e) { return false; }
  };

  // ── which window is in use ───────────────────────────────────────────────
  Engine.prototype.trackActive = function (doc) {
    var self = this;
    ACTIVE.forEach(function (t) {
      doc.addEventListener(t, function () {
        self.active = { doc: doc, at: Date.now() };
        if (doc === self.doc) self.sweep();
      }, true);
    });
  };

  // Safety net: a pop-up left in a window that has since closed (the hover
  // card, a menu) would be stuck there, and the tracker reuses it. Bring any
  // such back as soon as the main window is used.
  Engine.prototype.sweep = function () {
    if (!this.win || !this.win.__unifiedRoots) return;
    var now = Date.now();
    if (now - (this._swept || 0) < 300) return;
    this._swept = now;
    var self = this, d = this.doc, roots = this.win.__unifiedRoots;
    roots.slice().forEach(function (r) {
      if (r.__uPlace || self.alive(r.ownerDocument)) return;
      try { (r.__uHtml ? d.documentElement : d.body).appendChild(r); } catch (e) {}
      var i = roots.indexOf(r); if (i >= 0) roots.splice(i, 1);
    });
  };

  // ── pop-ups follow the window in use ─────────────────────────────────────
  Engine.prototype.isOverlay = function (el) {
    if (!el || el.nodeType !== 1) return false;
    if (/^(SCRIPT|STYLE|LINK|BASE|META|TITLE|HEAD|BODY)$/.test(el.tagName)) return false;
    if (el.id === 'p-root' || el.hasAttribute('data-u-mirror') || el.hasAttribute('data-u-copy')) return false;
    if (this.structural.indexOf(el) >= 0) return false;
    var cs;
    try { cs = el.ownerDocument.defaultView.getComputedStyle(el); } catch (e) { return false; }
    return cs.position === 'fixed' || cs.position === 'absolute';
  };
  function shown(el) {
    try {
      var cs = el.ownerDocument.defaultView.getComputedStyle(el);
      return cs.display !== 'none' && cs.visibility !== 'hidden' && !el.hidden && !el.classList.contains('hidden');
    } catch (e) { return false; }
  }
  Engine.prototype.observeOverlays = function (doc) {
    var self = this, view = doc.defaultView;
    new view.MutationObserver(function (records) {
      var seen = [];
      records.forEach(function (r) {
        var list = [];
        if (r.type === 'childList') {
          if (r.target !== doc.body && r.target !== doc.documentElement) return;
          list = Array.prototype.slice.call(r.addedNodes);
        } else {
          var p = r.target.parentNode;
          if (p !== doc.body && p !== doc.documentElement) return;
          list = [r.target];
        }
        list.forEach(function (el) { if (seen.indexOf(el) < 0) seen.push(el); });
      });
      seen.forEach(function (el) { self.follow(el); });
    }).observe(doc.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style', 'hidden'] });
  };
  Engine.prototype.follow = function (el) {
    var a = this.active, here = el.ownerDocument;
    if (!a.doc || a.doc === here || Date.now() - a.at > 1200) return;
    if (a.doc !== this.doc && this.portals.indexOf(a.doc) < 0) return;
    if (!this.alive(a.doc) || !el.parentNode || !this.isOverlay(el) || !shown(el)) return;
    var toHtml = el.parentNode === here.documentElement;
    el.__uHtml = toHtml;
    warm(el);
    (toHtml ? a.doc.documentElement : a.doc.body).appendChild(el);
    var roots = this.win.__unifiedRoots, i = roots.indexOf(el);
    if (a.doc === this.doc) { if (i >= 0) roots.splice(i, 1); }
    else if (i < 0) roots.push(el);
  };

  // ── portal pages ─────────────────────────────────────────────────────────
  // A portal page belongs to one engine load. One from an older load (the
  // main window reloaded, or the tracker reloaded with new settings) has to
  // be reloaded before use: its forwarded listeners belong to a page that's
  // gone.
  Engine.prototype.owns = function (pd) { return pd.__uEngineKind === this.kind && pd.__uGen === this.gen; };
  Engine.prototype.fresh = function (pd) { return !pd.__uGen; };

  Engine.prototype.prepare = function (pd) {
    if (this.owns(pd)) return true;
    if (!this.fresh(pd)) return false;            // caller reloads the portal first
    pd.__uEngineKind = this.kind;
    pd.__uGen = this.gen;
    var base = pd.querySelector('base') || pd.head.insertBefore(pd.createElement('base'), pd.head.firstChild);
    base.href = this.doc.baseURI;
    var own = pd.createElement('style');
    own.id = 'u-portal-css';
    own.textContent = PORTAL_CSS.common + (PORTAL_CSS[this.kind] || '');
    pd.head.appendChild(own);
    this.copyStyles(pd);
    this.copyRootAttrs(pd);
    var self = this;
    (this.win.__unifiedListeners || []).forEach(function (l) {
      if (FORWARD.indexOf(l.type) >= 0) forwardOne(pd, l.kind, l.type, l.fn, l.opts, true);
    });
    // And for inline handlers created later inside a portal (markup the
    // tracker writes into a moved piece): the tracker's functions are made
    // reachable from the portal's window as well.
    var pw = pd.defaultView, ew = this.win;
    Object.keys(ew).forEach(function (k) {
      try {
        if (typeof ew[k] === 'function' && !(k in pw)) pw[k] = ew[k];
      } catch (e) {}
    });
    this.trackActive(pd);
    this.observeOverlays(pd);
    this.portals = this.portals.filter(function (x) { return self.alive(x); });
    this.portals.push(pd);
    return true;
  };

  Engine.prototype.copyStyles = function (pd) {
    if (!this.alive(pd)) return;
    var DP = this.win.Document.prototype;
    Array.prototype.slice.call(pd.querySelectorAll('[data-u-copy]')).forEach(function (n) { n.remove(); });
    var anchor = pd.getElementById('u-portal-css');
    var src = DP.querySelectorAll.call(this.doc, 'style, link[rel~="stylesheet"]');
    Array.prototype.forEach.call(src, function (n) {
      var c = pd.importNode(n, true);
      c.setAttribute('data-u-copy', '');
      c.removeAttribute('id');
      pd.head.insertBefore(c, anchor);   // before ours, so ours win ties
    });
  };

  Engine.prototype.copyRootAttrs = function (pd) {
    if (!this.alive(pd)) return;
    var d = this.doc;
    [[d.documentElement, pd.documentElement], [d.body, pd.body]].forEach(function (pair) {
      ['class', 'style'].forEach(function (a) {
        var v = pair[0].getAttribute(a);
        if (v === null) pair[1].removeAttribute(a); else pair[1].setAttribute(a, v);
      });
    });
  };

  // ── moving pieces ────────────────────────────────────────────────────────
  // piece: { name, el, slot: 'top'|'fit'|'bot', chain: [ancestor ids], order }
  Engine.prototype.attach = function (piece, pd) {
    var el = piece.el;
    if (!el || !this.owns(pd)) return false;
    if (el.ownerDocument === pd && el.__uPortal === pd) return true;
    warm(el);
    if (!el.__uPlace && el.ownerDocument === this.doc) {
      el.__uPlace = this.doc.createComment('unified:' + piece.name);
      el.parentNode.insertBefore(el.__uPlace, el);
    }
    var parent = pd.getElementById('p-' + piece.slot);
    if (!parent) return false;
    var self = this;
    (piece.chain || []).forEach(function (id) {
      var m = null;
      Array.prototype.forEach.call(parent.children, function (c) { if (c.getAttribute('data-u-mirror') === id) m = c; });
      if (!m) {
        var orig = self.win.Document.prototype.getElementById.call(self.doc, id);
        m = pd.createElement(orig ? orig.tagName : 'div');
        m.setAttribute('data-u-mirror', id);
        m.id = id;
        if (orig) {
          var sync = function () { m.className = orig.className; };
          sync();
          new self.win.MutationObserver(sync).observe(orig, { attributes: true, attributeFilter: ['class'] });
        }
        parent.appendChild(m);
      }
      parent = m;
    });
    // keep pieces in their usual order within the same container
    var before = null;
    Array.prototype.forEach.call(parent.children, function (c) {
      if (!before && typeof c.__uOrder === 'number' && c.__uOrder > piece.order) before = c;
    });
    el.__uOrder = piece.order;
    parent.insertBefore(el, before);
    el.__uPortal = pd;
    var roots = this.win.__unifiedRoots;
    if (roots.indexOf(el) < 0) roots.push(el);
    if (this.structural.indexOf(el) < 0) this.structural.push(el);
    return true;
  };

  // Back to where it came from in the engine's page.
  Engine.prototype.detach = function (piece) {
    var el = piece.el;
    if (!el || !el.__uPlace || !el.__uPlace.parentNode) return;
    var pd = el.__uPortal;
    el.__uPlace.parentNode.insertBefore(el, el.__uPlace);
    el.__uPortal = null;
    var roots = this.win.__unifiedRoots, i = roots.indexOf(el);
    if (i >= 0) roots.splice(i, 1);
    if (pd) tidy(pd);
  };

  // A portal is going away: pop-ups that are in it come home, or they'd be
  // lost with it (the tracker reuses them).
  Engine.prototype.rescue = function (pd) {
    if (!this.doc) return;
    var d = this.doc, roots = this.win.__unifiedRoots;
    roots.slice().forEach(function (r) {
      if (r.ownerDocument !== pd || r.__uPlace) return;
      try { (r.__uHtml ? d.documentElement : d.body).appendChild(r); } catch (e) {}
      roots.splice(roots.indexOf(r), 1);
    });
    var i = this.portals.indexOf(pd);
    if (i >= 0) this.portals.splice(i, 1);
  };

  Engine.prototype.where = function (piece) {
    var el = piece.el;
    if (!el) return null;
    return el.__uPortal && this.alive(el.__uPortal) && el.ownerDocument === el.__uPortal ? el.__uPortal : 'dock';
  };

  // Empty containers left behind in a portal go.
  function tidy(pd) {
    try {
      Array.prototype.slice.call(pd.querySelectorAll('[data-u-mirror]')).reverse().forEach(function (m) {
        if (!m.children.length) m.remove();
      });
    } catch (e) {}
  }

  // Inline handlers (onclick="openItemSettings()") are compiled the first
  // time they're needed, against the page the element is in at that moment.
  // Compile them now, while it's still the tracker's own page.
  function warm(el) {
    try {
      var all = [el].concat(Array.prototype.slice.call(el.querySelectorAll('*')));
      all.forEach(function (n) {
        for (var i = 0; i < n.attributes.length; i++) {
          var a = n.attributes[i].name;
          if (a.length > 2 && a.charCodeAt(0) === 111 && a.charCodeAt(1) === 110) { void n[a]; }   // on*
        }
      });
    } catch (e) {}
  }

  function forwardOne(pd, kind, type, fn, opts, add) {
    try {
      var t = kind === 'doc' ? pd : pd.defaultView;
      if (add) t.addEventListener(type, fn, opts); else t.removeEventListener(type, fn, opts);
    } catch (e) {}
  }

  // ── widened lookups on the engine's document ─────────────────────────────
  function patchLookups(w) {
    var d = w.document;
    if (d.__uPatched) return;
    d.__uPatched = true;
    var DP = w.Document.prototype, slice = Array.prototype.slice;
    function away() {
      return (w.__unifiedRoots || []).filter(function (r) { return r.ownerDocument !== d && r.isConnected; });
    }
    function list(a) { a.item = function (i) { return this[i] || null; }; return a; }
    d.getElementById = function (id) {
      var r = DP.getElementById.call(d, id);
      if (r) return r;
      var L = away(), sel = '#' + w.CSS.escape(String(id));
      for (var i = 0; i < L.length; i++) {
        if (L[i].id === id) return L[i];
        var x = L[i].querySelector(sel);
        if (x) return x;
      }
      return null;
    };
    d.querySelector = function (s) {
      var r = DP.querySelector.call(d, s);
      if (r) return r;
      var L = away();
      for (var i = 0; i < L.length; i++) {
        try { if (L[i].matches(s)) return L[i]; } catch (e) {}
        var x = L[i].querySelector(s);
        if (x) return x;
      }
      return null;
    };
    d.querySelectorAll = function (s) {
      var a = slice.call(DP.querySelectorAll.call(d, s));
      away().forEach(function (r) {
        try { if (r.matches(s)) a.push(r); } catch (e) {}
        a.push.apply(a, slice.call(r.querySelectorAll(s)));
      });
      return list(a);
    };
    d.getElementsByClassName = function (c) {
      var a = slice.call(DP.getElementsByClassName.call(d, c));
      var sel = String(c).trim().split(/\s+/).map(function (x) { return '.' + w.CSS.escape(x); }).join('');
      if (sel) away().forEach(function (r) {
        if (r.matches(sel)) a.push(r);
        a.push.apply(a, slice.call(r.querySelectorAll(sel)));
      });
      return list(a);
    };
  }

  window.UnifiedPortal = { Engine: Engine };
})();
