// ============================================
// NCAA DOLT License Management System
// Service Worker — Offline-First Caching
// ============================================

const CACHE_NAME = 'ncaa-dolt-v16';

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

// Fetch: Network-first for all local assets to ensure instant updates on localhost, cache fallback when offline
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request, { ignoreSearch: true }).then((cached) => {
          if (cached) return cached;
          if (event.request.mode === 'navigate' || event.request.destination === 'document') {
            return caches.match('./index.html', { ignoreSearch: true });
          }
        });
      })
  );
});
