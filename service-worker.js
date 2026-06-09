// ONCLE MOUSS — Service Worker
// Cache-first pour fonctionnement hors-ligne complet

const CACHE_NAME = 'oncle-mouss-v1';
const ASSETS = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@300;400;500;700&family=Space+Mono:wght@400;700&display=swap'
];

// ── INSTALLATION : mise en cache des ressources de base
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return Promise.allSettled(
        ASSETS.map(url =>
          cache.add(url).catch(err => console.warn('Cache miss pour:', url, err))
        )
      );
    }).then(() => self.skipWaiting())
  );
});

// ── ACTIVATION : suppression des anciens caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => {
            console.log('Ancien cache supprimé:', key);
            return caches.delete(key);
          })
      )
    ).then(() => self.clients.claim())
  );
});

// ── FETCH : cache-first, réseau en fallback
self.addEventListener('fetch', event => {
  // Ignorer les requêtes non-GET et les extensions Chrome
  if (event.request.method !== 'GET') return;
  if (event.request.url.startsWith('chrome-extension://')) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      // Pas en cache → réseau, puis mise en cache
      return fetch(event.request)
        .then(response => {
          if (!response || response.status !== 200 || response.type === 'opaque') {
            return response;
          }
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(() => {
          // Hors-ligne et pas en cache : renvoyer index.html pour les navigations
          if (event.request.destination === 'document') {
            return caches.match('./index.html');
          }
        });
    })
  );
});
