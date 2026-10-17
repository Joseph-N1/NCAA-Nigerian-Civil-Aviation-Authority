// ============================================
// Rano Air CPCP Progress Tracker
// Service Worker - Offline-First Production Cache
// ============================================

const CACHE_NAME = 'rano-air-cpcp-v16';

self.addEventListener('install', (event) => {
  // Only pre-cache the HTML shell and manifest.
  // Vite-hashed JS/CSS assets are cached dynamically on first fetch.
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      const shellUrls = [
        './',
        './index.html',
        './manifest.json'
      ];
      for (const url of shellUrls) {
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

  // Never cache Netlify function calls (API requests)
  const url = new URL(event.request.url);
  if (url.pathname.startsWith('/.netlify/')) return;

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
