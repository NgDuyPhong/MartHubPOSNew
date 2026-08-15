const CACHE_PREFIX = 'marthub-pos-';

// This worker retires the previous offline implementation. Inertia pages depend
// on session-aware JSON responses and must never be served from an HTML cache.
self.addEventListener('install', (event) => {
    event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        (async () => {
            const cacheNames = await caches.keys();

            await Promise.all(cacheNames.filter((cacheName) => cacheName.startsWith(CACHE_PREFIX)).map((cacheName) => caches.delete(cacheName)));
            await self.clients.claim();
            await self.registration.unregister();
        })(),
    );
});
