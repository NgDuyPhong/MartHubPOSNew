import { useCallback, useEffect, useState } from 'react';
import { cacheCatalog, type CatalogCacheScope } from '../api/catalog-cache-repository';
import { pendingSales, repricePendingSale, type PendingSale } from '../api/offline-sale-repository';
import { retryPendingSale, syncPendingSales } from '../api/offline-sale-sync';
import type { CategoryOption, PosVersions, Product } from '../model/types';

type ConnectivityOptions = {
    catalog: Product[];
    categories: CategoryOption[];
    scope: CatalogCacheScope;
    versions: PosVersions;
    onSync: (synced: number) => void;
    onReconnect: () => Promise<void>;
    onRefreshCatalog: () => Promise<Product[]>;
    onCacheError?: (error: unknown) => void;
};

export function useConnectivity(options: ConnectivityOptions) {
    const { catalog, categories, scope, versions, onSync, onReconnect, onRefreshCatalog, onCacheError } = options;
    const scopeKey = `${scope.organizationId}:${scope.branchId}`;
    const [online, setOnline] = useState(() => navigator.onLine);
    const [pendingCount, setPendingCount] = useState(0);
    const [records, setRecords] = useState<PendingSale[]>([]);

    const refreshPending = useCallback(async () => {
        const nextRecords = await pendingSales(scopeKey);
        setRecords(nextRecords);
        setPendingCount(nextRecords.length);
    }, [scopeKey]);

    const syncNow = useCallback(async () => {
        const result = await syncPendingSales(scopeKey);
        await refreshPending();
        if (result.synced) {
            onSync(result.synced);
            await onReconnect();
        }

        return result;
    }, [onReconnect, onSync, refreshPending, scopeKey]);

    const retry = useCallback(
        async (idempotencyKey: string) => {
            const result = await retryPendingSale(idempotencyKey, scopeKey);
            await refreshPending();
            if (result === 'synced') await onReconnect();

            return result;
        },
        [onReconnect, refreshPending, scopeKey],
    );

    const reprice = useCallback(
        async (idempotencyKey: string) => {
            if (!navigator.onLine) return 'not_available' as const;

            const freshCatalog = await onRefreshCatalog();
            const result = await repricePendingSale(idempotencyKey, freshCatalog, scopeKey);
            await refreshPending();

            return result;
        },
        [onRefreshCatalog, refreshPending, scopeKey],
    );

    useEffect(() => {
        void cacheCatalog(catalog, categories, scope, `${versions.catalog}:${versions.inventory}`).catch((error) => {
            onCacheError?.(error);
        });
    }, [catalog, categories, onCacheError, scope, versions.catalog, versions.inventory]);

    useEffect(() => {
        void refreshPending().catch(() => undefined);
        if (navigator.onLine) void syncNow().catch(() => undefined);

        const goOnline = () => {
            setOnline(true);
            void syncNow().catch(() => undefined);
        };
        const goOffline = () => setOnline(false);

        window.addEventListener('online', goOnline);
        window.addEventListener('offline', goOffline);
        return () => {
            window.removeEventListener('online', goOnline);
            window.removeEventListener('offline', goOffline);
        };
    }, [refreshPending, syncNow]);

    return { online, pendingCount, records, refreshPending, syncNow, retry, reprice };
}
