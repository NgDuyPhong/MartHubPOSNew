import type { CartDraft, CartLine, CheckoutDraftSnapshot } from '../model/types';

const DB_NAME = 'marthub-pos';
const DB_VERSION = 3;
const DRAFTS_STORE = 'cart-drafts';

function openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains('pending-sales')) db.createObjectStore('pending-sales', { keyPath: 'idempotency_key' });
            if (!db.objectStoreNames.contains(DRAFTS_STORE)) db.createObjectStore(DRAFTS_STORE, { keyPath: 'id' });
            if (!db.objectStoreNames.contains('metadata')) db.createObjectStore('metadata', { keyPath: 'id' });
            if (!db.objectStoreNames.contains('catalog')) db.createObjectStore('catalog');
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

function isCheckoutSnapshot(value: unknown): value is CheckoutDraftSnapshot {
    if (!value || typeof value !== 'object') return false;
    const snapshot = value as Partial<CheckoutDraftSnapshot>;

    return (
        (snapshot.customerId === null || typeof snapshot.customerId === 'number') &&
        typeof snapshot.cash === 'number' &&
        typeof snapshot.qr === 'number' &&
        typeof snapshot.qrConfirmed === 'boolean'
    );
}

function isCartLine(value: unknown): value is CartLine {
    if (!value || typeof value !== 'object') return false;
    const line = value as Partial<CartLine>;

    return (
        typeof line.key === 'string' &&
        Boolean(line.product) &&
        Boolean(line.variant) &&
        Boolean(line.productUnit) &&
        typeof line.quantity === 'number' &&
        typeof line.unitPrice === 'number' &&
        typeof line.discount === 'number'
    );
}

function normalizeDraft(value: unknown): CartDraft | null {
    if (!value || typeof value !== 'object') return null;
    const draft = value as Partial<CartDraft>;

    if (
        typeof draft.id !== 'string' ||
        typeof draft.name !== 'string' ||
        !Array.isArray(draft.cart) ||
        !draft.cart.every(isCartLine) ||
        !isCheckoutSnapshot(draft.checkout)
    ) {
        return null;
    }

    return {
        id: draft.id,
        name: draft.name.slice(0, 32) || 'Đơn chưa đặt tên',
        cart: draft.cart,
        checkout: draft.checkout,
        active: Boolean(draft.active),
        updatedAt: typeof draft.updatedAt === 'string' ? draft.updatedAt : new Date(0).toISOString(),
    };
}

export async function getCartDrafts(): Promise<CartDraft[]> {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
        const request = db.transaction(DRAFTS_STORE, 'readonly').objectStore(DRAFTS_STORE).getAll();
        request.onsuccess = () => {
            db.close();
            resolve((request.result as unknown[]).map(normalizeDraft).filter((draft): draft is CartDraft => draft !== null));
        };
        request.onerror = () => {
            db.close();
            reject(request.error);
        };
    });
}

export async function saveCartDrafts(drafts: CartDraft[]): Promise<void> {
    const db = await openDatabase();

    await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(DRAFTS_STORE, 'readwrite');
        const store = transaction.objectStore(DRAFTS_STORE);
        store.clear();
        drafts.forEach((draft) => store.put(draft));
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error);
    });
    db.close();
}
