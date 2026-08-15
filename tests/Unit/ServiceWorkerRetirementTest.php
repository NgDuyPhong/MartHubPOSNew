<?php

it('retires the service worker without intercepting Inertia requests', function () {
    $serviceWorker = file_get_contents(public_path('sw.js'));

    expect($serviceWorker)
        ->toContain("const CACHE_PREFIX = 'marthub-pos-';")
        ->toContain('caches.delete(cacheName)')
        ->toContain('self.registration.unregister()')
        ->not->toContain("self.addEventListener('fetch'")
        ->not->toContain("'/pos'");
});

it('cleans up existing service worker registrations and caches in production', function () {
    $applicationBootstrap = file_get_contents(resource_path('js/app.tsx'));

    expect($applicationBootstrap)
        ->toContain('navigator.serviceWorker.getRegistrations()')
        ->toContain("scriptUrl.pathname === '/sw.js'")
        ->toContain('registration.unregister()')
        ->toContain("cacheName.startsWith('marthub-pos-')")
        ->not->toContain("serviceWorker.register('/sw.js'");
});
