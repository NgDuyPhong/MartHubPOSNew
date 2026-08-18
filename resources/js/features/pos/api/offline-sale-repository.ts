import type { Product, SaleReceipt } from '../model/types';
import { openPosDatabase, POS_STORES } from './pos-database';

const SALES_STORE = POS_STORES.pendingSales;
const METADATA_STORE = POS_STORES.metadata;
const LAST_RECEIPT_KEY_PREFIX = 'last-receipt:';

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

export const PRICE_REPRICE_REQUIRED_CODE = 'PRICE_REPRICE_REQUIRED';

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
    scope_key?: string;
};

function nowIso(): string {
    return new Date().toISOString();
}

function hasPriceSnapshot(payload: PendingSalePayload): boolean {
    return Array.isArray(payload.items) && payload.items.every((item) => typeof item.unit_price === 'number' && Number.isFinite(item.unit_price));
}

function normalizePendingSale(value: unknown): PendingSale {
    const record = value as Partial<PendingSale> & PendingSalePayload;
    const payload = 'payload' in record && record.payload ? record.payload : record;
    const createdAt = record.created_at ?? nowIso();
    const missingPriceSnapshot = !hasPriceSnapshot(payload);

    return {
        idempotency_key: record.idempotency_key ?? payload.idempotency_key,
        payload: { ...payload, source: payload.source ?? 'offline_sync', queued_at: payload.queued_at ?? createdAt },
        status: missingPriceSnapshot ? 'conflict' : (record.status ?? 'pending'),
        attempts: record.attempts ?? 0,
        created_at: createdAt,
        updated_at: record.updated_at ?? createdAt,
        last_attempt_at: record.last_attempt_at ?? null,
        last_error_code: missingPriceSnapshot ? 'MISSING_PRICE_SNAPSHOT' : (record.last_error_code ?? null),
        last_error_message: missingPriceSnapshot
            ? 'Đơn offline cũ không có giá tại thời điểm bán; cần xử lý thủ công trước khi đồng bộ.'
            : (record.last_error_message ?? null),
        scope_key: typeof record.scope_key === 'string' ? record.scope_key : undefined,
    };
}

export async function queueSale(payload: PendingSalePayload, scopeKey: string): Promise<PendingSale> {
    const db = await openPosDatabase();
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
        scope_key: scopeKey,
    };

    await new Promise<void>((resolve, reject) => {
        const request = db.transaction(SALES_STORE, 'readwrite').objectStore(SALES_STORE).put(record);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
    db.close();
    return record;
}

export async function pendingSales(scopeKey?: string): Promise<PendingSale[]> {
    const db = await openPosDatabase();
    const transaction = db.transaction(SALES_STORE, 'readwrite');
    const store = transaction.objectStore(SALES_STORE);
    const records: PendingSale[] = [];

    return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => {
            const normalizedRecords = (request.result as unknown[]).map(normalizePendingSale);
            normalizedRecords.forEach((record) => store.put(record));
            records.push(...normalizedRecords.filter((record) => scopeKey === undefined || record.scope_key === scopeKey));
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
    const db = await openPosDatabase();
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

async function replacePendingSalePayload(idempotencyKey: string, payload: PendingSalePayload, scopeKey: string): Promise<void> {
    const db = await openPosDatabase();
    const transaction = db.transaction(SALES_STORE, 'readwrite');
    const store = transaction.objectStore(SALES_STORE);
    const request = store.get(idempotencyKey);

    await new Promise<void>((resolve, reject) => {
        request.onsuccess = () => {
            if (!request.result) {
                resolve();
                return;
            }

            const record = normalizePendingSale(request.result);
            if (record.scope_key !== scopeKey) {
                resolve();
                return;
            }

            store.put({
                ...record,
                payload,
                status: 'pending',
                last_attempt_at: null,
                last_error_code: null,
                last_error_message: null,
                updated_at: nowIso(),
            });
        };
        request.onerror = () => reject(request.error);
        transaction.oncomplete = () => {
            db.close();
            resolve();
        };
        transaction.onerror = () => {
            db.close();
            reject(transaction.error);
        };
    });
}

export async function repricePendingSale(idempotencyKey: string, catalog: Product[], scopeKey: string): Promise<'repriced' | 'not_available'> {
    const record = (await pendingSales(scopeKey)).find((item) => item.idempotency_key === idempotencyKey);
    if (
        !record ||
        record.status !== 'conflict' ||
        record.last_error_code !== PRICE_REPRICE_REQUIRED_CODE ||
        record.payload.source !== 'offline_sync'
    ) {
        return 'not_available';
    }

    const unitsById = new Map(catalog.flatMap((product) => product.variants.flatMap((variant) => variant.units)).map((unit) => [unit.id, unit]));
    const repricedItems = record.payload.items.map((item) => {
        const currentUnit = unitsById.get(item.product_unit_id);

        if (!currentUnit || typeof item.unit_price !== 'number' || item.discount_amount) {
            return null;
        }

        return { ...item, unit_price: currentUnit.sale_price };
    });

    if (repricedItems.some((item) => item === null)) {
        return 'not_available';
    }

    const completeItems = repricedItems.filter((item): item is NonNullable<typeof item> => item !== null);
    await replacePendingSalePayload(idempotencyKey, { ...record.payload, items: completeItems }, scopeKey);

    return 'repriced';
}

export async function removePendingSale(idempotencyKey: string): Promise<void> {
    const db = await openPosDatabase();
    await new Promise<void>((resolve, reject) => {
        const request = db.transaction(SALES_STORE, 'readwrite').objectStore(SALES_STORE).delete(idempotencyKey);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
    db.close();
}

export async function exportPendingSales(scopeKey?: string): Promise<string> {
    return JSON.stringify({ exported_at: nowIso(), records: await pendingSales(scopeKey) }, null, 2);
}

export async function saveLastReceipt(receipt: SaleReceipt, scopeKey: string): Promise<void> {
    const db = await openPosDatabase();
    const receiptWithoutCustomer = { ...receipt };
    delete receiptWithoutCustomer.customer_name;

    await new Promise<void>((resolve, reject) => {
        const request = db
            .transaction(METADATA_STORE, 'readwrite')
            .objectStore(METADATA_STORE)
            .put({ id: `${LAST_RECEIPT_KEY_PREFIX}${scopeKey}`, value: receiptWithoutCustomer });
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
    db.close();
}

export async function getLastReceipt(scopeKey: string): Promise<SaleReceipt | null> {
    const db = await openPosDatabase();

    return new Promise((resolve, reject) => {
        const request = db.transaction(METADATA_STORE, 'readonly').objectStore(METADATA_STORE).get(`${LAST_RECEIPT_KEY_PREFIX}${scopeKey}`);
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
