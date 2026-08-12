import { requestJson } from './http/client';

const DB_NAME = 'marthub-pos';
const DB_VERSION = 1;
const SALES_STORE = 'pending-sales';
const CATALOG_STORE = 'catalog';

export type PendingSale = {
    idempotency_key: string;
    shift_id: number;
    customer_id: number | null;
    source: 'online' | 'offline_sync';
    note?: string;
    items: Array<{ product_unit_id: number; quantity: number; unit_price?: number; discount_amount?: number }>;
    payments: Array<{ method: 'cash' | 'qr'; amount: number; reference?: string; manually_confirmed?: boolean }>;
    due_date?: string;
};

function database(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(SALES_STORE)) db.createObjectStore(SALES_STORE, { keyPath: 'idempotency_key' });
            if (!db.objectStoreNames.contains(CATALOG_STORE)) db.createObjectStore(CATALOG_STORE);
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function put(storeName: string, value: unknown, key?: IDBValidKey): Promise<void> {
    const db = await database();
    await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const request = key === undefined ? transaction.objectStore(storeName).put(value) : transaction.objectStore(storeName).put(value, key);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
    db.close();
}

export async function cacheCatalog(catalog: unknown): Promise<void> {
    await put(CATALOG_STORE, catalog, 'latest');
}
export async function queueSale(sale: PendingSale): Promise<void> {
    await put(SALES_STORE, sale);
}

export async function pendingSales(): Promise<PendingSale[]> {
    const db = await database();
    return new Promise((resolve, reject) => {
        const request = db.transaction(SALES_STORE).objectStore(SALES_STORE).getAll();
        request.onsuccess = () => {
            db.close();
            resolve(request.result as PendingSale[]);
        };
        request.onerror = () => reject(request.error);
    });
}

export async function removePendingSale(key: string): Promise<void> {
    const db = await database();
    await new Promise<void>((resolve, reject) => {
        const request = db.transaction(SALES_STORE, 'readwrite').objectStore(SALES_STORE).delete(key);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
    db.close();
}

export async function syncPendingSales(): Promise<{ synced: number; failed: number }> {
    let synced = 0;
    let failed = 0;
    for (const sale of await pendingSales()) {
        try {
            await requestJson('/sales', { method: 'POST', body: sale });
            await removePendingSale(sale.idempotency_key);
            synced++;
        } catch {
            failed++;
        }
    }
    return { synced, failed };
}
