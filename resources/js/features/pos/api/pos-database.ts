export const POS_DB_NAME = 'marthub-pos';
export const POS_DB_VERSION = 4;

export const POS_STORES = {
    pendingSales: 'pending-sales',
    cartDrafts: 'cart-drafts',
    metadata: 'metadata',
    catalogSnapshots: 'catalog-snapshots',
} as const;

export function openPosDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(POS_DB_NAME, POS_DB_VERSION);

        request.onupgradeneeded = () => {
            const database = request.result;
            if (!database.objectStoreNames.contains(POS_STORES.pendingSales)) {
                database.createObjectStore(POS_STORES.pendingSales, { keyPath: 'idempotency_key' });
            }
            if (!database.objectStoreNames.contains(POS_STORES.cartDrafts)) {
                database.createObjectStore(POS_STORES.cartDrafts, { keyPath: 'id' });
            }
            if (!database.objectStoreNames.contains(POS_STORES.metadata)) {
                database.createObjectStore(POS_STORES.metadata, { keyPath: 'id' });
            }
            if (!database.objectStoreNames.contains(POS_STORES.catalogSnapshots)) {
                database.createObjectStore(POS_STORES.catalogSnapshots, { keyPath: 'key' });
            }
            if (database.objectStoreNames.contains(POS_STORES.metadata)) {
                const metadata = request.transaction?.objectStore(POS_STORES.metadata);
                const receiptRequest = metadata?.get('last-receipt');
                if (receiptRequest) {
                    receiptRequest.onsuccess = () => {
                        const storedReceipt = receiptRequest.result;
                        if (!storedReceipt?.value || typeof storedReceipt.value !== 'object') return;
                        const safeReceipt = { ...(storedReceipt.value as Record<string, unknown>) };
                        delete safeReceipt.customer_name;
                        metadata?.put({ id: 'last-receipt', value: safeReceipt });
                    };
                }
            }
            if (database.objectStoreNames.contains('catalog')) {
                database.deleteObjectStore('catalog');
            }
        };
        request.onsuccess = () => {
            request.result.onversionchange = () => request.result.close();
            resolve(request.result);
        };
        request.onerror = () => reject(request.error ?? new Error('Không thể mở bộ nhớ POS.'));
        request.onblocked = () => reject(new Error('Bộ nhớ POS đang được mở ở một tab khác.'));
    });
}
