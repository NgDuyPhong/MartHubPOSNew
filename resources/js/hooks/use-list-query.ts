import type { ListQuery } from '@/types/pagination';
import type { GlobalEvent } from '@inertiajs/core';
import { router } from '@inertiajs/react';
import { useCallback, useEffect, useRef, useState } from 'react';

function compactQuery(query: ListQuery): Record<string, string | number | boolean> {
    return Object.fromEntries(Object.entries(query).filter(([, value]) => value !== undefined && value !== null && value !== '')) as Record<
        string,
        string | number | boolean
    >;
}

export function useListQuery<T extends ListQuery & { page: number }>(
    routeUrl: string,
    initialQuery: T,
    options: { canRequest?: (query: T) => boolean } = {},
) {
    const [query, setQuery] = useState<T>(initialQuery);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const firstRender = useRef(true);
    const initialQueryRef = useRef(initialQuery);
    const canRequestRef = useRef(options.canRequest);
    const lastRequestQuery = useRef<T | null>(null);
    const requestSequence = useRef(0);
    const activeRequest = useRef<number | null>(null);

    canRequestRef.current = options.canRequest;

    const request = useCallback(
        (nextQuery: T) => {
            if (canRequestRef.current && !canRequestRef.current(nextQuery)) {
                return;
            }

            const requestQuery = { ...nextQuery, page: 1 } as T;
            const requestId = requestSequence.current + 1;
            requestSequence.current = requestId;
            activeRequest.current = requestId;
            lastRequestQuery.current = requestQuery;
            setIsLoading(true);
            setError(null);

            router.get(routeUrl, compactQuery(requestQuery), {
                preserveState: true,
                preserveScroll: true,
                replace: true,
                onStart: () => {
                    if (activeRequest.current === requestId) setIsLoading(true);
                },
                onSuccess: () => {
                    if (activeRequest.current === requestId) setError(null);
                },
                onError: (errors) => {
                    if (activeRequest.current !== requestId) return;

                    const firstError = Object.values(errors)[0];
                    setError(typeof firstError === 'string' ? firstError : 'Không thể tải dữ liệu. Vui lòng thử lại.');
                },
                onCancel: () => {
                    if (activeRequest.current !== requestId) return;

                    activeRequest.current = null;
                    setIsLoading(false);
                },
                onFinish: () => {
                    if (activeRequest.current !== requestId) return;

                    activeRequest.current = null;
                    setIsLoading(false);
                },
            });
        },
        [routeUrl],
    );

    useEffect(() => {
        const handleException = (event: GlobalEvent<'exception'>) => {
            if (activeRequest.current === null) return;

            event.preventDefault();
            activeRequest.current = null;
            setError(event.detail.exception?.message || 'Không thể tải dữ liệu. Vui lòng thử lại.');
            setIsLoading(false);
        };

        const removeExceptionListener = router.on('exception', handleException);

        return removeExceptionListener;
    }, []);

    useEffect(() => {
        if (firstRender.current) {
            firstRender.current = false;
            return;
        }

        const timeout = window.setTimeout(() => {
            request(query);
        }, 300);

        return () => window.clearTimeout(timeout);
    }, [query, request]);

    const update = <K extends keyof T>(key: K, value: T[K]) => {
        setQuery((current) => ({ ...current, [key]: value, page: 1 }));
    };

    const reset = () => {
        setQuery((current) => ({ ...initialQueryRef.current, per_page: current.per_page, page: 1 }));
    };

    const retry = () => request(lastRequestQuery.current ?? query);

    return { query, setQuery, update, reset, isLoading, error, retry };
}
