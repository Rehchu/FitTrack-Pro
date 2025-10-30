/*
  FitTrack Pro Service Worker (free, minimal)
  - Caches app shell for offline navigation
  - Caches static assets at runtime (cache-first)
  - Caches key API GET responses for offline profile views (network-first with cache fallback)
*/

const APP_CACHE = 'fittrack-app-v1';
const ASSET_CACHE = 'fittrack-assets-v1';
const API_CACHE = 'fittrack-api-v1';

const APP_SHELL = [
  '/',
  '/index.html',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APP_CACHE).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => ![APP_CACHE, ASSET_CACHE, API_CACHE].includes(key))
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle same-origin requests (leave CDNs as-is)
  const isSameOrigin = url.origin === self.location.origin;

  // Navigation requests (SPA): network-first, fallback to cached index.html
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Static assets: cache-first by extension
  if (isSameOrigin && /\.(?:js|css|png|jpg|jpeg|gif|svg|webp|ico|woff2?|ttf|mp4|webm)$/.test(url.pathname)) {
    event.respondWith(cacheFirst(req, ASSET_CACHE));
    return;
  }

  // API GET endpoints for offline profile
  if (
    isSameOrigin &&
    req.method === 'GET' &&
    url.pathname.startsWith('/api/') &&
    (
      /\/clients\/(\d+)\/(profile|measurements|meals)/.test(url.pathname) ||
      /\/trainers\/dashboard/.test(url.pathname)
    )
  ) {
    event.respondWith(networkFirst(req, API_CACHE));
    return;
  }
});

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const resp = await fetch(request);
    if (resp && resp.ok) cache.put(request, resp.clone());
    return resp;
  } catch (e) {
    return cached || Response.error();
  }
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const resp = await fetch(request);
    if (resp && resp.ok) cache.put(request, resp.clone());
    return resp;
  } catch (e) {
    const cached = await cache.match(request);
    if (cached) return cached;
    return new Response(JSON.stringify({ error: 'offline', message: 'Showing no cached data' }), {
      headers: { 'Content-Type': 'application/json' },
      status: 503,
    });
  }
}
