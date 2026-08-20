import { useCallback, useEffect, useRef, useState } from 'react';
import type { PosSnapshotResponse } from '../api/pos-api';
import { getPosFreshness, getPosSnapshot } from '../api/pos-api';
import type { PosVersions } from '../model/types';

type PosResourceRefreshOptions = {
    versions: PosVersions;
    online: boolean;
    onSnapshot: (snapshot: PosSnapshotResponse) => void;
    onVersions: (versions: PosVersions) => void;
    onError?: (error: unknown) => void;
    onSuccess?: () => void;
};

const snapshotResourcesByChange: Record<string, string[]> = {
    catalog: ['catalog', 'categories'],
    inventory: ['catalog', 'categories', 'expiryAlerts'],
    customers: ['customers'],
    activeShift: ['activeShift'],
};

function getSnapshotResources(changed: string[]): string[] {
    return [...new Set(changed.flatMap((resource) => snapshotResourcesByChange[resource] ?? []))];
}

export function usePosResourceRefresh({ versions, online, onSnapshot, onVersions, onError, onSuccess }: PosResourceRefreshOptions) {
    const versionsRef = useRef(versions);
    const onlineRef = useRef(online);
    const mountedRef = useRef(true);
    const requestRef = useRef<Promise<void> | null>(null);
    const pendingRefreshRef = useRef(false);
    const requestIdRef = useRef(0);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<unknown>(null);

    versionsRef.current = versions;
    onlineRef.current = online;

    const refresh = useCallback(async () => {
        if (requestRef.current) {
            if (onlineRef.current && navigator.onLine && document.visibilityState === 'visible') pendingRefreshRef.current = true;

            return requestRef.current;
        }
        if (!onlineRef.current || !navigator.onLine || document.visibilityState !== 'visible') return;

        const requestId = ++requestIdRef.current;
        const request = (async () => {
            setRefreshing(true);

            try {
                const freshness = await getPosFreshness(versionsRef.current);
                if (!mountedRef.current || requestId !== requestIdRef.current) return;

                const resources = getSnapshotResources(freshness.changed);
                if (!resources.length) {
                    onVersions(freshness.versions);
                    setError(null);
                    onSuccess?.();
                    return;
                }

                const snapshot = await getPosSnapshot(resources);
                if (!mountedRef.current || requestId !== requestIdRef.current) return;

                onSnapshot(snapshot);
                setError(null);
                onSuccess?.();
            } catch (refreshError) {
                if (!mountedRef.current || requestId !== requestIdRef.current) return;

                setError(refreshError);
                onError?.(refreshError);
            } finally {
                if (mountedRef.current && requestId === requestIdRef.current) setRefreshing(false);
            }
        })();

        requestRef.current = request;
        try {
            await request;
        } finally {
            if (requestRef.current === request) {
                requestRef.current = null;
                if (pendingRefreshRef.current) {
                    pendingRefreshRef.current = false;
                    window.setTimeout(() => {
                        if (mountedRef.current) void refresh();
                    }, 0);
                }
            }
        }
    }, [onError, onSnapshot, onSuccess, onVersions]);

    useEffect(() => {
        mountedRef.current = true;
        void refresh();

        const refreshWhenVisible = () => {
            if (document.visibilityState === 'visible') void refresh();
        };
        const refreshOnFocus = () => void refresh();
        const refreshWhenOnline = () => {
            onlineRef.current = true;
            void refresh();
        };

        document.addEventListener('visibilitychange', refreshWhenVisible);
        window.addEventListener('focus', refreshOnFocus);
        window.addEventListener('online', refreshWhenOnline);

        return () => {
            mountedRef.current = false;
            pendingRefreshRef.current = false;
            document.removeEventListener('visibilitychange', refreshWhenVisible);
            window.removeEventListener('focus', refreshOnFocus);
            window.removeEventListener('online', refreshWhenOnline);
        };
    }, [refresh]);

    return { refresh, refreshing, error };
}
