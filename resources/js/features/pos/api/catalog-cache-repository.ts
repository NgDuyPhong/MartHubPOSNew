const DB_NAME = 'marthub-pos';
const DB_VERSION = 1;

export async function cacheCatalog(catalog: unknown): Promise<void> {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = () => {
            const database = request.result;
            if (!database.objectStoreNames.contains('pending-sales')) {
                database.createObjectStore('pending-sales', { keyPath: 'idempotency_key' });
            }
            if (!database.objectStoreNames.contains('catalog')) {
                database.createObjectStore('catalog');
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });

    await new Promise<void>((resolve, reject) => {
        const request = db.transaction('catalog', 'readwrite').objectStore('catalog').put(catalog, 'latest');
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
    db.close();
}
