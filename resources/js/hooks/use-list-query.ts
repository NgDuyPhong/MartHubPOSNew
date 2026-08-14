import type { ListQuery } from '@/types/pagination';
import { router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

function compactQuery(query: ListQuery): Record<string, string | number | boolean> {
    return Object.fromEntries(Object.entries(query).filter(([, value]) => value !== undefined && value !== null && value !== '')) as Record<
        string,
        string | number | boolean
    >;
}

export function useListQuery<T extends ListQuery & { page: number }>(routeUrl: string, initialQuery: T) {
    const [query, setQuery] = useState<T>(initialQuery);
    const firstRender = useRef(true);
    const initialQueryRef = useRef(initialQuery);

    useEffect(() => {
        if (firstRender.current) {
            firstRender.current = false;
            return;
        }

        const timeout = window.setTimeout(() => {
            router.get(routeUrl, compactQuery({ ...query, page: 1 }), {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            });
        }, 300);

        return () => window.clearTimeout(timeout);
    }, [query, routeUrl]);

    const update = <K extends keyof T>(key: K, value: T[K]) => {
        setQuery((current) => ({ ...current, [key]: value, page: 1 }));
    };

    const reset = () => {
        setQuery((current) => ({ ...initialQueryRef.current, per_page: current.per_page, page: 1 }));
    };

    return { query, setQuery, update, reset };
}
