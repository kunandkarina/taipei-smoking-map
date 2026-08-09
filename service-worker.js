const CACHE_NAME = 'taipei-smoking-map-v1';

const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './src/main.js',
  './src/map.js',
  './src/geolocation.js',
  './src/filters.js',
  './src/ui/detailView.js',
  './src/ui/filterBar.js',
  './src/styles/main.css',
  './public/data/smoking-areas.json',
  './public/icons/icon-192.png',
  './public/icons/icon-512.png',
  './public/icons/icon-180.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

// Network-first for same-origin requests: iOS Safari can evict the cache
// and localStorage after ~a week of disuse, so every load should prefer
// fresh data/assets and only fall back to cache when actually offline.
// Cross-origin requests (map tiles, CDN scripts, fonts) are left to the
// browser's own handling rather than intercepted here.
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        const responseCopy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, responseCopy));
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached || caches.match('./index.html')))
  );
});
