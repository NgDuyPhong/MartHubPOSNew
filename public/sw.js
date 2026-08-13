const CACHE_VERSION = 'marthub-pos-v1';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const PAGE_CACHE = `${CACHE_VERSION}-pages`;
const OFFLINE_URL = '/pos';

self.addEventListener('install', (event) => {
    event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        (async () => {
            const cacheNames = await caches.keys();

            await Promise.all(
                cacheNames
                    .filter((cacheName) => cacheName.startsWith('marthub-pos-') && ![STATIC_CACHE, PAGE_CACHE].includes(cacheName))
                    .map((cacheName) => caches.delete(cacheName)),
            );

            await self.clients.claim();
        })(),
    );
});

self.addEventListener('fetch', (event) => {
    const request = event.request;
    const url = new URL(request.url);

    if (request.method !== 'GET' || url.origin !== self.location.origin) {
        return;
    }

    if (request.headers.has('X-Inertia') || request.headers.has('X-Requested-With')) {
        return;
    }

    if (request.mode === 'navigate') {
        event.respondWith(networkFirstPage(request));
        return;
    }

    if (url.pathname.startsWith('/build/') || url.pathname.startsWith('/storage/')) {
        event.respondWith(cacheFirstAsset(request));
    }
});

async function networkFirstPage(request) {
    const requestedPathname = new URL(request.url).pathname;

    try {
        const response = await fetch(request);

        if (response.ok && requestedPathname === OFFLINE_URL) {
            const pageCache = await caches.open(PAGE_CACHE);
            await pageCache.put(request, response.clone());
        }

        return response;
    } catch {
        const pageCache = await caches.open(PAGE_CACHE);
        const cachedPage = await pageCache.match(request);

        if (cachedPage) {
            return cachedPage;
        }

        const offlinePage = requestedPathname === OFFLINE_URL ? await pageCache.match(OFFLINE_URL) : undefined;

        return offlinePage ?? new Response('MartHub POS đang ngoại tuyến. Hãy mở POS một lần khi có mạng trước khi sử dụng offline.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });
    }
}

async function cacheFirstAsset(request) {
    const staticCache = await caches.open(STATIC_CACHE);
    const cachedAsset = await staticCache.match(request);

    if (cachedAsset) {
        return cachedAsset;
    }

    const response = await fetch(request);

    if (response.ok) {
        await staticCache.put(request, response.clone());
    }

    return response;
}
