import type { CartDraft, CartLine, CheckoutDraftSnapshot } from '../model/types';
import { openPosDatabase, POS_STORES } from './pos-database';

const DRAFTS_STORE = POS_STORES.cartDrafts;

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
        scope_key: typeof draft.scope_key === 'string' ? draft.scope_key : undefined,
    };
}

export async function getCartDrafts(scopeKey: string): Promise<CartDraft[]> {
    const db = await openPosDatabase();

    return new Promise((resolve, reject) => {
        const request = db.transaction(DRAFTS_STORE, 'readonly').objectStore(DRAFTS_STORE).getAll();
        request.onsuccess = () => {
            db.close();
            resolve(
                (request.result as unknown[])
                    .map(normalizeDraft)
                    .filter((draft): draft is CartDraft => draft !== null && draft.scope_key === scopeKey),
            );
        };
        request.onerror = () => {
            db.close();
            reject(request.error);
        };
    });
}

export async function saveCartDrafts(drafts: CartDraft[], scopeKey: string): Promise<void> {
    const db = await openPosDatabase();

    await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(DRAFTS_STORE, 'readwrite');
        const store = transaction.objectStore(DRAFTS_STORE);
        const request = store.getAll();
        request.onsuccess = () => {
            (request.result as unknown[]).forEach((value) => {
                const draft = normalizeDraft(value);
                if (draft?.scope_key === scopeKey) store.delete(draft.id);
            });
            drafts.forEach((draft) => store.put({ ...draft, scope_key: scopeKey }));
        };
        request.onerror = () => transaction.abort();
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error);
    });
    db.close();
}
