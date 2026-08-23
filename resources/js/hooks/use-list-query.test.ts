import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { router } from '@inertiajs/react';
import { useListQuery } from './use-list-query';

vi.mock('@inertiajs/react', () => ({
    router: {
        get: vi.fn(),
        on: vi.fn(() => vi.fn()),
    },
}));

type DateQuery = { from: string | null; to: string | null; page: number; per_page: number };

describe('useListQuery', () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it('suppresses a request while the date range is reversed', async () => {
        const { result } = renderHook(() =>
            useListQuery<DateQuery>(
                '/sales',
                { from: null, to: null, page: 1, per_page: 25 },
                { canRequest: (query) => !query.from || !query.to || query.from <= query.to },
            ),
        );

        act(() => {
            result.current.update('from', '2026-08-20');
            result.current.update('to', '2026-08-01');
        });

        await new Promise((resolve) => window.setTimeout(resolve, 350));

        expect(router.get).not.toHaveBeenCalled();
    });

    it('exposes recoverable loading and error state', async () => {
        vi.mocked(router.get).mockImplementation((_url, _data, options) => {
            options?.onStart?.({} as never);
            options?.onError?.({ server: 'Không thể tải dữ liệu.' });
            options?.onFinish?.({} as never);
        });

        const { result } = renderHook(() => useListQuery('/sales', { page: 1, per_page: 25 }));

        act(() => result.current.update('per_page', 50));
        await new Promise((resolve) => window.setTimeout(resolve, 350));

        expect(result.current.isLoading).toBe(false);
        expect(result.current.error).toBe('Không thể tải dữ liệu.');

        act(() => result.current.retry());

        expect(router.get).toHaveBeenCalledTimes(2);
    });

    it('ignores cancellation from an older request and handles transport exceptions', async () => {
        const requests: Array<{ onCancel?: () => void }> = [];
        let exceptionHandler: ((event: { detail: { exception: Error }; preventDefault: () => void }) => void) | undefined;

        vi.mocked(router.get).mockImplementation((_url, _data, options) => {
            requests.push({ onCancel: options?.onCancel });
            options?.onStart?.({} as never);
        });
        vi.mocked(router.on).mockImplementation((event, callback) => {
            if (event === 'exception') exceptionHandler = callback as typeof exceptionHandler;
            return vi.fn();
        });

        const { result } = renderHook(() => useListQuery('/sales', { page: 1, per_page: 25 }));

        act(() => result.current.update('per_page', 50));
        await new Promise((resolve) => window.setTimeout(resolve, 350));
        act(() => result.current.update('per_page', 100));
        await new Promise((resolve) => window.setTimeout(resolve, 350));

        act(() => requests[0]?.onCancel?.());
        expect(result.current.error).toBeNull();
        expect(result.current.isLoading).toBe(true);

        act(() =>
            exceptionHandler?.({
                detail: { exception: new Error('Mất kết nối') },
                preventDefault: vi.fn(),
            }),
        );

        expect(result.current.error).toBe('Mất kết nối');
        expect(result.current.isLoading).toBe(false);
    });
});
