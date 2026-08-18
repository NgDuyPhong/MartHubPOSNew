import { useCallback, useEffect, useState } from 'react';
import { cacheCatalog } from '../api/catalog-cache-repository';
import { pendingSales, type PendingSale } from '../api/offline-sale-repository';
import { retryPendingSale, syncPendingSales } from '../api/offline-sale-sync';

export function useConnectivity(catalog: unknown, onSync: (synced: number) => void) {
    const [online, setOnline] = useState(() => navigator.onLine);
    const [pendingCount, setPendingCount] = useState(0);
    const [records, setRecords] = useState<PendingSale[]>([]);

    const refreshPending = useCallback(async () => {
        const nextRecords = await pendingSales();
        setRecords(nextRecords);
        setPendingCount(nextRecords.length);
    }, []);

    const syncNow = useCallback(async () => {
        const result = await syncPendingSales();
        await refreshPending();
        if (result.synced) onSync(result.synced);
        return result;
    }, [onSync, refreshPending]);

    const retry = useCallback(
        async (idempotencyKey: string) => {
            const result = await retryPendingSale(idempotencyKey);
            await refreshPending();
            return result;
        },
        [refreshPending],
    );

    useEffect(() => {
        void cacheCatalog(catalog);
        void refreshPending();
        if (navigator.onLine) {
            void syncNow();
        }

        const goOnline = async () => {
            setOnline(true);
            await syncNow();
        };
        const goOffline = () => setOnline(false);

        window.addEventListener('online', goOnline);
        window.addEventListener('offline', goOffline);
        return () => {
            window.removeEventListener('online', goOnline);
            window.removeEventListener('offline', goOffline);
        };
    }, [catalog, refreshPending, syncNow]);

    return { online, pendingCount, records, refreshPending, syncNow, retry };
}
