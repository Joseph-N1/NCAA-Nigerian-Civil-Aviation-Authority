// ============================================
// Rano Air CPCP Progress Tracker
// Service Worker - Offline-First Production Cache
// ============================================

const CACHE_NAME = 'rano-air-cpcp-desktop-v11';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      const urlsToCache = [
        './',
        './index.html',
        './assets/logo-DJAEnbEi.png',
        './assets/manifest-BdvM-eSP.json',
        './assets/index-DmZQCaR8.css',
        './assets/index-DiCJXKQq.js',
        './assets/index.es-Y7T0oLQV.js',
        './assets/purify.es-ChwZkWde.js'
      ];
      for (const url of urlsToCache) {
        try {
          await cache.add(url);
        } catch (e) {
          console.warn('[SW] Could not cache:', url);
        }
      }
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match('./index.html')))
  );
});
