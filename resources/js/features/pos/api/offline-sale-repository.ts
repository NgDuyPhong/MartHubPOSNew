import type { SaleReceipt } from '../model/types';

const DB_NAME = 'marthub-pos';
const DB_VERSION = 3;
const SALES_STORE = 'pending-sales';
const DRAFTS_STORE = 'cart-drafts';
const METADATA_STORE = 'metadata';
const LAST_RECEIPT_KEY = 'last-receipt';

export type PendingSalePayload = {
    idempotency_key: string;
    shift_id: number;
    customer_id: number | null;
    source: 'online' | 'offline_sync';
    occurred_at?: string;
    queued_at?: string;
    note?: string;
    items: Array<{ product_unit_id: number; quantity: number; unit_price?: number; discount_amount?: number }>;
    payments: Array<{ method: 'cash' | 'qr'; amount: number; reference?: string; manually_confirmed?: boolean }>;
    due_date?: string;
};

export type PendingSaleStatus = 'pending' | 'syncing' | 'failed' | 'conflict';

export type PendingSale = {
    idempotency_key: string;
    payload: PendingSalePayload;
    status: PendingSaleStatus;
    attempts: number;
    created_at: string;
    updated_at: string;
    last_attempt_at: string | null;
    last_error_code: string | null;
    last_error_message: string | null;
};

function openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(SALES_STORE)) db.createObjectStore(SALES_STORE, { keyPath: 'idempotency_key' });
            if (!db.objectStoreNames.contains(DRAFTS_STORE)) db.createObjectStore(DRAFTS_STORE, { keyPath: 'id' });
            if (!db.objectStoreNames.contains(METADATA_STORE)) db.createObjectStore(METADATA_STORE, { keyPath: 'id' });
            if (!db.objectStoreNames.contains('catalog')) db.createObjectStore('catalog');
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

function nowIso(): string {
    return new Date().toISOString();
}

function normalizePendingSale(value: unknown): PendingSale {
    const record = value as Partial<PendingSale> & PendingSalePayload;
    const payload = 'payload' in record && record.payload ? record.payload : record;
    const createdAt = record.created_at ?? nowIso();

    return {
        idempotency_key: record.idempotency_key ?? payload.idempotency_key,
        payload: { ...payload, source: payload.source ?? 'offline_sync', queued_at: payload.queued_at ?? createdAt },
        status: record.status ?? 'pending',
        attempts: record.attempts ?? 0,
        created_at: createdAt,
        updated_at: record.updated_at ?? createdAt,
        last_attempt_at: record.last_attempt_at ?? null,
        last_error_code: record.last_error_code ?? null,
        last_error_message: record.last_error_message ?? null,
    };
}

export async function queueSale(payload: PendingSalePayload): Promise<PendingSale> {
    const db = await openDatabase();
    const timestamp = nowIso();
    const record: PendingSale = {
        idempotency_key: payload.idempotency_key,
        payload: { ...payload, source: 'offline_sync', queued_at: timestamp },
        status: 'pending',
        attempts: 0,
        created_at: timestamp,
        updated_at: timestamp,
        last_attempt_at: null,
        last_error_code: null,
        last_error_message: null,
    };

    await new Promise<void>((resolve, reject) => {
        const request = db.transaction(SALES_STORE, 'readwrite').objectStore(SALES_STORE).put(record);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
    db.close();
    return record;
}

export async function pendingSales(): Promise<PendingSale[]> {
    const db = await openDatabase();
    const transaction = db.transaction(SALES_STORE, 'readwrite');
    const store = transaction.objectStore(SALES_STORE);
    const records: PendingSale[] = [];

    return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => {
            records.push(...(request.result as unknown[]).map(normalizePendingSale));
            records.forEach((record) => store.put(record));
        };
        request.onerror = () => {
            db.close();
            reject(request.error);
        };
        transaction.oncomplete = () => {
            db.close();
            resolve(records);
        };
        transaction.onerror = () => {
            db.close();
            reject(transaction.error);
        };
    });
}

export async function updatePendingSale(idempotencyKey: string, changes: Partial<Omit<PendingSale, 'idempotency_key' | 'payload'>>): Promise<void> {
    const db = await openDatabase();
    const store = db.transaction(SALES_STORE, 'readwrite').objectStore(SALES_STORE);
    const request = store.get(idempotencyKey);

    await new Promise<void>((resolve, reject) => {
        request.onsuccess = () => {
            if (!request.result) {
                resolve();
                return;
            }
            store.put({ ...normalizePendingSale(request.result), ...changes, updated_at: nowIso() });
            resolve();
        };
        request.onerror = () => reject(request.error);
    });
    db.close();
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

export async function exportPendingSales(): Promise<string> {
    return JSON.stringify({ exported_at: nowIso(), records: await pendingSales() }, null, 2);
}

export async function saveLastReceipt(receipt: SaleReceipt): Promise<void> {
    const db = await openDatabase();

    await new Promise<void>((resolve, reject) => {
        const request = db.transaction(METADATA_STORE, 'readwrite').objectStore(METADATA_STORE).put({ id: LAST_RECEIPT_KEY, value: receipt });
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
    db.close();
}

export async function getLastReceipt(): Promise<SaleReceipt | null> {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
        const request = db.transaction(METADATA_STORE, 'readonly').objectStore(METADATA_STORE).get(LAST_RECEIPT_KEY);
        request.onsuccess = () => {
            db.close();
            resolve((request.result?.value as SaleReceipt | undefined) ?? null);
        };
        request.onerror = () => {
            db.close();
            reject(request.error);
        };
    });
}
