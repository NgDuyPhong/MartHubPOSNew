const CACHE_PREFIX = 'marthub-pos-shell-';

// Retirement worker for the previous app-shell implementation. It deliberately
// does not intercept requests: Inertia pages and session responses must always
// use the network and keep their X-Inertia response contract.
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
