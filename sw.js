/* Billionaire Kart service worker — cache-first for the app shell so the game
   works offline after the first load (Three.js CDN included, cached at runtime). */
const CACHE = 'bk-v6';
const SHELL = ['./', './index.html', './style.css', './game.js', './portraits.js', './ui-fx.js', './assets/fonts/fredoka-latin.woff2', './assets/fonts/luckiestguy-latin.woff2', './manifest.webmanifest', './gfx/textures.js', './gfx/materials.js', './gfx/environment.js', './gfx/post.js', './gfx/sky-data.js', './tracks/datacenter.js', './tracks/waters.js', './tracks/whitehouse.js', './tracks/shared.js', './tracks/metaverse.js', './tracks/wework.js', './tracks/burningman.js', './tracks/bahamas.js', './tracks/bliss.js', './tracks/tunnel.js', './tracks/davos.js'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(hit => {
      const network = fetch(e.request).then(res => {
        if (res && (res.status === 200 || res.type === 'opaque')) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return res;
      }).catch(() => hit);
      return hit || network;
    })
  );
});
