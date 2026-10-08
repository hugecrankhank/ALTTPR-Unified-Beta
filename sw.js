/*
 * Service worker: makes the site installable and lets the app shell open
 * offline. Network-first for this site's own files, so every update shows up
 * as soon as you're online; the cache is only a fallback. EmulatorJS files
 * from its CDN are cached as they load, so a game you've already run once can
 * start without a connection.
 */
const CACHE = 'alttpr-unified-full-v1';
const CDN = 'https://cdn.emulatorjs.org/';

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['./', './index.html', './manifest.webmanifest'])).catch(() => {}));
  self.skipWaiting();
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('alttpr-unified-full-') && k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = req.url;
  const sameOrigin = url.startsWith(self.registration.scope);
  if (!sameOrigin && !url.startsWith(CDN)) return;   // leave everything else alone
  e.respondWith(
    fetch(req).then((res) => {
      if (res && (res.ok || res.type === 'opaque')) {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
      }
      return res;
    // Offline: any cached copy of that file. EmulatorJS adds a query that changes
    // every hour to its core report (cores/reports/snes9x.json?v=…), so CDN files
    // are matched without the query too, like this site's own.
    }).catch(() => caches.match(req, { ignoreSearch: true }).then((hit) => hit || Response.error()))
  );
});
