/* Billionaire Kart service worker.
   - Code and pages: network first, so a new release shows up as soon as you are online.
   - Art, audio, fonts: served from cache at once, and refreshed in the background, so a changed picture
     shows up on the next visit without anyone having to clear anything.
   - Offline: everything you have already loaded keeps working.
   It also evicts the caches of the old v1 build and reloads any page that build was still serving. */
const VERSION = 'bk2-3';
const ASSET = /\.(webp|png|jpg|jpeg|mp3|ogg|woff2)$/i;

self.addEventListener('install', e => { e.waitUntil(self.skipWaiting()); });
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    const hadOld = keys.some(k => !k.startsWith('bk2-'));
    await Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)));
    await self.clients.claim();
    if (hadOld) for (const c of await self.clients.matchAll({ type: 'window' })) c.navigate(c.url).catch(() => {});
  })());
});
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(VERSION);
    if (ASSET.test(url.pathname)) {
      const hit = await cache.match(req);
      const fresh = fetch(req).then(res => { if (res.ok) cache.put(req, res.clone()); return res; });
      if (hit) { e.waitUntil(fresh.catch(() => {})); return hit; }
      return fresh;
    }
    try { const res = await fetch(req); if (res.ok) cache.put(req, res.clone()); return res; }
    catch { return (await cache.match(req)) || (await cache.match('./index.html')) || Response.error(); }
  })());
});
