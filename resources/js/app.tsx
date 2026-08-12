import '../css/app.css';

import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';
import { route as routeFn } from 'ziggy-js';
import { initializeTheme } from './hooks/use-appearance';

declare global {
    const route: typeof routeFn;
}

const appName = import.meta.env.VITE_APP_NAME || 'MartHub POS';

createInertiaApp({
    title: (title) => `${title} - ${appName}`,
    resolve: (name) => resolvePageComponent(`./pages/${name}.tsx`, import.meta.glob('./pages/**/*.tsx')),
    setup({ el, App, props }) {
        const root = createRoot(el);

        root.render(<App {...props} />);
    },
    progress: {
        color: '#4B5563',
    },
});

// This will set light / dark mode on load...
initializeTheme();

async function retireLegacyServiceWorker() {
    if (!('serviceWorker' in navigator)) {
        return;
    }

    const registrations = await navigator.serviceWorker.getRegistrations();

    await Promise.all(
        registrations
            .filter((registration) => {
                const scriptUrl = registration.active?.scriptURL ?? registration.scope;

                return new URL(scriptUrl).origin === window.location.origin && scriptUrl.endsWith('/sw.js');
            })
            .map((registration) => registration.unregister()),
    );

    if ('caches' in window) {
        const cacheNames = await window.caches.keys();

        await Promise.all(
            cacheNames.filter((cacheName) => cacheName.startsWith('marthub-pos-shell-')).map((cacheName) => window.caches.delete(cacheName)),
        );
    }
}

if (import.meta.env.PROD) {
    window.addEventListener('load', () => {
        void retireLegacyServiceWorker();
    });
}
