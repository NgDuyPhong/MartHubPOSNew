import { useEffect, useState } from 'react';
import { cacheCatalog } from '../api/catalog-cache-repository';
import { pendingSales } from '../api/offline-sale-repository';
import { syncPendingSales } from '../api/offline-sale-sync';

export function useConnectivity(catalog: unknown, onSync: (synced: number) => void) {
    const [online, setOnline] = useState(() => navigator.onLine);
    const [pendingCount, setPendingCount] = useState(0);

    const refreshPending = async () => {
        setPendingCount((await pendingSales()).length);
    };

    useEffect(() => {
        void cacheCatalog(catalog);
        void refreshPending();
        if (navigator.onLine) {
            void syncPendingSales().then(async (result) => {
                await refreshPending();
                if (result.synced) onSync(result.synced);
            });
        }

        const goOnline = async () => {
            setOnline(true);
            const result = await syncPendingSales();
            await refreshPending();
            if (result.synced) onSync(result.synced);
        };
        const goOffline = () => setOnline(false);

        window.addEventListener('online', goOnline);
        window.addEventListener('offline', goOffline);
        return () => {
            window.removeEventListener('online', goOnline);
            window.removeEventListener('offline', goOffline);
        };
    }, [catalog, onSync]);

    return { online, pendingCount, refreshPending };
}
