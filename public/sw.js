const CACHE = 'marthub-pos-shell-v1';

self.addEventListener('install', (event) => {
    event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(['/pos'])));
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;
    const url = new URL(event.request.url);
    if (url.origin !== self.location.origin) return;

    if (event.request.mode === 'navigate') {
        event.respondWith(fetch(event.request).then((response) => {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(event.request, copy));
            return response;
        }).catch(() => caches.match('/pos')));
        return;
    }

    event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
        if (response.ok && (url.pathname.startsWith('/build/') || url.pathname.startsWith('/storage/'))) {
            caches.open(CACHE).then((cache) => cache.put(event.request, response.clone()));
        }
        return response;
    })));
});
