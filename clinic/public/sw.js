// Service worker: lets the installed app open, and say it is offline, without a network. Nothing more.
//   - Pages: network first, so a new version shows at once; the saved copy is used only offline.
//   - Build files (/_next/static/, named by content hash): saved copy first.
//   - Data (/api/) and the live channel (/socket.io/) never pass through here and are never saved:
//     no patient data is ever stored on the phone.
// The build id and the file list below are filled in by scripts/finalize-sw.mjs after `next build`.
const BUILD = '__BUILD__';
const PRECACHE = __PRECACHE__;
const CACHE = `clinic-${BUILD}`;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('clinic-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/socket.io/')) return;
  if (request.mode === 'navigate') event.respondWith(page(request, url));
  else if (url.pathname.startsWith('/_next/static/')) event.respondWith(savedFirst(request));
  else event.respondWith(networkFirst(request));
});

const saveable = (response) => response.ok && response.type === 'basic';

/** A page: from the network; offline, the saved copy of that page (any page works: the app routes itself). */
async function page(request, url) {
  try {
    const response = await fetch(request);
    if (saveable(response)) {
      const copy = response.clone();
      void caches.open(CACHE).then((cache) => cache.put(url.pathname, copy));
    }
    return response;
  } catch (err) {
    const cache = await caches.open(CACHE);
    const saved = (await cache.match(url.pathname)) || (await cache.match('/'));
    if (saved) return saved;
    throw err;
  }
}

async function savedFirst(request) {
  const cache = await caches.open(CACHE);
  const saved = await cache.match(request);
  if (saved) return saved;
  const response = await fetch(request);
  if (saveable(response)) void cache.put(request, response.clone());
  return response;
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (saveable(response)) {
      const copy = response.clone();
      void caches.open(CACHE).then((cache) => cache.put(request, copy));
    }
    return response;
  } catch (err) {
    const saved = await (await caches.open(CACHE)).match(request);
    if (saved) return saved;
    throw err;
  }
}
