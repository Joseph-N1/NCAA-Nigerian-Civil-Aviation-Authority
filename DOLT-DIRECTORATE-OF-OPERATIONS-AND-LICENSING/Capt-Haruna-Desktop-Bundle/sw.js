// ============================================
// NCAA DOLT License Management System
// Service Worker — Offline-First Caching
// ============================================

const CACHE_NAME = 'ncaa-dolt-v5';

const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/index.css',
  './css/components.css',
  './css/dashboard.css',
  './css/personnel.css',
  './css/forms.css',
  './js/app.js',
  './js/db.js',
  './js/pages/dashboard.js',
  './js/pages/pilots.js',
  './js/pages/cabin-crew.js',
  './js/pages/flight-dispatchers.js',
  './js/pages/ame.js',
  './js/pages/atc.js',
  './js/pages/aso.js',
  './js/pages/atsep.js',
  './js/pages/flight-engineers.js',
  './js/pages/settings.js',
  './js/components/sidebar.js',
  './js/components/search.js',
  './js/components/detail-panel.js',
  './js/components/form-builder.js',
  './js/components/table.js',
  './js/components/toast.js',
  './js/components/auth.js',
  './js/utils/export.js',
  './js/utils/import.js',
  './js/utils/date-utils.js',
  './js/utils/validators.js',
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

// Fetch: Cache-first strategy for static assets
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

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
          .catch(() => cache.match(event.request))
      )
    );
    return;
  }

  // For all other requests — cache first, network fallback
  event.respondWith(
    caches.match(event.request).then((cached) => {
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
          return caches.match('./index.html');
        }
      });
    })
  );
});
