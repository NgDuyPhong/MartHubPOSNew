import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

if (!globalThis.ResizeObserver) {
    globalThis.ResizeObserver = class {
        disconnect() {}

        observe() {}

        unobserve() {}
    } as typeof ResizeObserver;
}

afterEach(() => {
    cleanup();
});
