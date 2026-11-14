/* Network-first game code, stale-while-revalidate media. The installation
   fetches the startup shell because the first online page is not controlled. */
importScripts('./offline-shell.js');
const scope = self.registration.scope;
const CACHE = 'billionaire-kart:' + scope;
const shellPage = new URL('index.html', scope).href;
const ASSET = /\.(webp|png|jpg|jpeg|mp3|ogg|woff2)$/i;
const inScope = address => address.startsWith(scope);

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(SHELL.map(path => new Request(new URL(path, scope), { cache: 'reload' })));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const legacy = (await caches.keys()).filter(name => /^(?:bk-v|bk2-)\d+$/.test(name));
    // Old caches had a single origin-wide name. Keep anything belonging to a
    // sibling deployment, including other paths inside the same legacy cache.
    for (const name of legacy) {
      const old = await caches.open(name), next = await caches.open(CACHE);
      for (const request of await old.keys()) {
        if (!inScope(request.url)) continue;
        if (ASSET.test(new URL(request.url).pathname) && !await next.match(request)) {
          const hit = await old.match(request);
          if (hit) await next.put(request, hit);
        }
        await old.delete(request);
      }
      if (!(await old.keys()).length) await caches.delete(name);
    }
    await self.clients.claim();
  })());
});

async function fetchAndStore(request, cache) {
  const response = await fetch(request);
  if (response.ok && response.status !== 206) {
    // A full quota must not turn a usable network response into an error.
    await cache.put(request, response.clone()).catch(() => {});
  }
  return response;
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || !inScope(request.url) || request.headers.has('range')) return;
  const cache = caches.open(CACHE);
  if (ASSET.test(new URL(request.url).pathname)) {
    const hit = cache.then(c => c.match(request));
    const fresh = cache.then(c => fetchAndStore(request, c));
    // Register the lifetime promise immediately, including when a cached
    // response finishes before the network update.
    event.waitUntil(fresh.catch(() => {}));
    event.respondWith(hit.then(response => response || fresh));
    return;
  }
  event.respondWith(cache.then(async c => {
    try { return await fetchAndStore(request, c); }
    catch {
      const hit = await c.match(request);
      if (hit) return hit;
      if (request.mode === 'navigate') return (await c.match(shellPage)) || Response.error();
      return Response.error();
    }
  }));
});
