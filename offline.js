/*
 * "Make available offline": download everything the app needs in one go, so it
 * works in airplane mode, including the parts you haven't used yet (the emulator
 * core before your first game, Kara's generator and Python before your first
 * Kara seed).
 *
 * The service worker (sw.js) already falls back to its cache when there's no
 * connection; this fills that cache. The list of files is offline-files.json,
 * written by the build (scripts/build.mjs). Once you've made the app available
 * offline, later updates refresh the offline copy by themselves when you're online.
 *
 * Works offline without this: seed generation (both generators run in the
 * browser), the tracker, your saved base ROM, sprite, settings and saves.
 * Needs internet whatever you do: Kara's server and race seeds, alttpr.com seed
 * links, and browsing the sprite library.
 */
(function () {
  'use strict';
  var MARK = 'offline-pack.json';     // stored in the cache once a download completes
  var CONCURRENCY = 6;
  var list = null, busy = false, btn = null;

  function abs(p) { return new URL(p, location.href).href; }
  function isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }
  function installed() {
    return navigator.standalone === true ||
      (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
  }

  function show(state, text, title) {
    btn.dataset.state = state;
    btn.textContent = text;
    btn.title = title || '';
    btn.disabled = state === 'busy';
  }

  async function check() {
    try {
      var hit = await (await caches.open(list.cache)).match(abs(MARK));
      if (!hit) return 'none';
      var m = await hit.json();
      return m.version === list.version ? 'ready' : 'stale';
    } catch (e) { return 'none'; }
  }

  function paint(state) {
    if (state === 'ready') {
      show('ready', '✓ Available offline', 'Everything this app needs is saved on this device, so it works with no ' +
        'internet. (Kara’s server, alttpr.com seed links and the sprite library still need a connection.)' +
        (isIOS() && !installed() ? '\n\nTip: Share → Add to Home Screen, so iOS keeps the offline copy.' : '') +
        '\n\nClick to download it again.');
    } else if (state === 'stale') {
      show('stale', '⤓ Update offline copy', 'The app has been updated since you saved it for offline use.');
    } else {
      show('none', '⤓ Make available offline', 'Download everything this app needs, including the emulator and the ' +
        'seed generators, so it works in airplane mode.');
    }
  }

  async function fetchOne(cache, url, cross) {
    var res;
    try {
      res = await fetch(url, cross ? { mode: 'cors', cache: 'no-cache' } : { cache: 'no-cache' });
    } catch (e) {
      if (!cross) throw e;
      res = await fetch(url, { mode: 'no-cors', cache: 'no-cache' });   // stored as-is, works for scripts
    }
    if (!res.ok && res.type !== 'opaque') throw new Error(res.status + ' ' + url);
    await cache.put(url, res);
  }

  async function download() {
    if (busy) return;
    busy = true;
    try { if (navigator.storage && navigator.storage.persist) await navigator.storage.persist(); } catch (e) {}
    var cache = await caches.open(list.cache);
    var E = list.emulator;
    var jobs = list.files.map(function (f) { return { url: abs(f) }; })
      .concat(E.files.map(function (f) { return { url: E.base + f, cross: true }; }))
      .concat(E.cores.map(function (f) { return { url: E.base + f, cross: true, core: true }; }));
    // EmulatorJS loads its translation on non-English devices
    var lang = navigator.language || 'en-US';
    if (!/^en(-US)?$/i.test(lang)) jobs.push({ url: E.base + 'localization/' + lang + '.json', cross: true, optional: true });

    var done = 0, failed = [], coreOk = false, next = 0;
    show('busy', 'Downloading… 0%');
    async function worker() {
      while (next < jobs.length) {
        var j = jobs[next++];
        try { await fetchOne(cache, j.url, j.cross); if (j.core) coreOk = true; }
        catch (e) { if (!j.core && !j.optional) failed.push(j.url); }
        done++;
        show('busy', 'Downloading… ' + Math.floor(done * 100 / jobs.length) + '%');
      }
    }
    var workers = [];
    for (var i = 0; i < CONCURRENCY; i++) workers.push(worker());
    await Promise.all(workers);
    if (!coreOk) failed.push(E.base + E.cores[0]);
    busy = false;

    if (failed.length) {
      show('failed', '⚠ Offline download incomplete, retry', failed.length + ' file(s) couldn’t be downloaded ' +
        '(check your connection), for example:\n' + failed.slice(0, 5).join('\n'));
      console.warn('[offline] not downloaded:', failed);
      return;
    }
    await cache.put(abs(MARK), new Response(JSON.stringify({ version: list.version, at: Date.now() }),
      { headers: { 'Content-Type': 'application/json' } }));
    paint('ready');
    if (isIOS() && !installed()) {
      try {
        if (!localStorage.getItem('unified-offline-tip')) {
          localStorage.setItem('unified-offline-tip', '1');
          alert('Saved for offline use.\n\nTip: tap Share → Add to Home Screen and open it from there. ' +
            'iOS can clear a website’s saved files if it isn’t used for a few weeks, but not a Home Screen app’s.');
        }
      } catch (e) {}
    }
  }

  async function init() {
    if (!('caches' in window) || !('serviceWorker' in navigator)) return;
    try {
      var r = await fetch('offline-files.json', { cache: 'no-cache' });
      if (!r.ok) return;
      list = await r.json();
    } catch (e) {
      // offline: use the copy saved with the download
      try { var hit = await caches.match(abs('offline-files.json')); if (hit) list = await hit.json(); } catch (x) {}
      if (!list) return;
    }
    btn = document.createElement('button');
    btn.id = 'offline-btn';
    btn.type = 'button';
    var header = document.querySelector('header'), before = document.getElementById('install-btn');
    header.insertBefore(btn, before || null);
    var st = document.createElement('style');
    st.textContent = '#offline-btn[data-state=ready] { color: var(--accent); }' +
      '#offline-btn[data-state=failed] { border-color: var(--warn); color: var(--warn); }' +
      '#offline-btn[data-state=busy] { cursor: progress; }';
    document.head.appendChild(st);

    btn.addEventListener('click', function () {
      if (btn.dataset.state === 'ready' && !confirm('This app is already saved for offline use. Download it again?')) return;
      download();
    });
    var state = await check();
    paint(state);
    // You chose to keep an offline copy: keep it current after updates
    if (state === 'stale' && navigator.onLine) download();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
