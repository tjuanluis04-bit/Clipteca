const CACHE_NAME = 'clipteca-v1';
const APP_SHELL = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// App shell: cache-first. Everything else (previews, API calls): network-first, no caching of failures.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  if(url.origin === self.location.origin && APP_SHELL.some(p => url.pathname.endsWith(p.replace('./','')))){
    event.respondWith(
      caches.match(req).then((cached) => cached || fetch(req))
    );
    return;
  }

  // Let all other requests (microlink previews, thumbnails, fonts) go straight to network.
});
