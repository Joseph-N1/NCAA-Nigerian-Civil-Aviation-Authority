// ============================================
// NCAA DOLT License Management System
// Service Worker — Offline-First Caching
// ============================================

const CACHE_NAME = 'ncaa-dolt-v14';

const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/index.css?v=9',
  './css/components.css?v=9',
  './css/dashboard.css?v=9',
  './css/personnel.css?v=9',
  './css/forms.css?v=9',
  './js/app.js?v=9',
  './js/db.js?v=9',
  './js/pages/dashboard.js?v=9',
  './js/pages/pilots.js?v=9',
  './js/pages/cabin-crew.js?v=9',
  './js/pages/flight-dispatchers.js?v=9',
  './js/pages/ame.js?v=9',
  './js/pages/atc.js?v=9',
  './js/pages/aso.js?v=9',
  './js/pages/atsep.js?v=9',
  './js/pages/flight-engineers.js?v=9',
  './js/pages/settings.js?v=9',
  './js/components/sidebar.js?v=9',
  './js/components/search.js?v=9',
  './js/components/detail-panel.js?v=9',
  './js/components/form-builder.js?v=9',
  './js/components/table.js?v=9',
  './js/components/toast.js?v=9',
  './js/components/auth.js?v=9',
  './js/utils/export.js?v=9',
  './js/utils/import.js?v=9',
  './js/utils/date-utils.js?v=9',
  './js/utils/validators.js?v=9',
  './lib/dexie.min.js'
];

// Install: Cache all static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate: Clean up old caches
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

// Fetch: Cache-first strategy for static assets, network-first for documents
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // For HTML documents — network first, cache fallback (ensures latest updates render)
  if (event.request.mode === 'navigate' || event.request.destination === 'document' || event.request.url.endsWith('index.html')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request, { ignoreSearch: true }))
    );
    return;
  }

  // For Google Fonts — network first, cache fallback
  if (event.request.url.includes('fonts.googleapis.com') || 
      event.request.url.includes('fonts.gstatic.com')) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) =>
        fetch(event.request)
          .then((response) => {
            cache.put(event.request, response.clone());
            return response;
          })
          .catch(() => cache.match(event.request, { ignoreSearch: true }))
      )
    );
    return;
  }

  // For all other requests — cache first, network fallback
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        // Cache successful responses for future offline use
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      }).catch(() => {
        // If both cache and network fail, return offline page
        if (event.request.destination === 'document') {
          return caches.match('./index.html', { ignoreSearch: true });
        }
      });
    })
  );
});
