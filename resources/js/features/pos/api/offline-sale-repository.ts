const DB_NAME = 'marthub-pos';
const DB_VERSION = 1;
const SALES_STORE = 'pending-sales';

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

function openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(SALES_STORE)) {
                db.createObjectStore(SALES_STORE, { keyPath: 'idempotency_key' });
            }
            if (!db.objectStoreNames.contains('catalog')) {
                db.createObjectStore('catalog');
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

export async function queueSale(sale: PendingSale): Promise<void> {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
        const request = db.transaction(SALES_STORE, 'readwrite').objectStore(SALES_STORE).put(sale);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
    db.close();
}

export async function pendingSales(): Promise<PendingSale[]> {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
        const request = db.transaction(SALES_STORE).objectStore(SALES_STORE).getAll();
        request.onsuccess = () => {
            db.close();
            resolve(request.result as PendingSale[]);
        };
        request.onerror = () => reject(request.error);
    });
}

export async function removePendingSale(idempotencyKey: string): Promise<void> {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
        const request = db.transaction(SALES_STORE, 'readwrite').objectStore(SALES_STORE).delete(idempotencyKey);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
    db.close();
}
