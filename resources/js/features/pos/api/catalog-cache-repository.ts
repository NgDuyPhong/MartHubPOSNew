import type { CategoryOption, PosSnapshot, Product } from '../model/types';
import { openPosDatabase, POS_STORES } from './pos-database';

export type CatalogCacheScope = { organizationId: number; branchId: number };

function scopeKey(scope: CatalogCacheScope): string {
    return `${scope.organizationId}:${scope.branchId}`;
}

export async function cacheCatalog(catalog: Product[], categories: CategoryOption[], scope: CatalogCacheScope, serverVersion: string): Promise<void> {
    const database = await openPosDatabase();
    const snapshot: PosSnapshot = {
        key: scopeKey(scope),
        schemaVersion: 1,
        serverVersion,
        fetchedAt: new Date().toISOString(),
        catalog,
        categories,
    };

    await new Promise<void>((resolve, reject) => {
        const transaction = database.transaction(POS_STORES.catalogSnapshots, 'readwrite');
        transaction.objectStore(POS_STORES.catalogSnapshots).put(snapshot);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error ?? new Error('Không thể lưu snapshot catalog.'));
        transaction.onabort = () => reject(transaction.error ?? new Error('Không thể lưu snapshot catalog.'));
    }).finally(() => database.close());
}

export async function getCachedCatalog(scope: CatalogCacheScope): Promise<PosSnapshot | null> {
    const database = await openPosDatabase();

    return new Promise((resolve, reject) => {
        const request = database.transaction(POS_STORES.catalogSnapshots, 'readonly').objectStore(POS_STORES.catalogSnapshots).get(scopeKey(scope));
        request.onsuccess = () => {
            database.close();
            resolve((request.result as PosSnapshot | undefined) ?? null);
        };
        request.onerror = () => {
            database.close();
            reject(request.error ?? new Error('Không thể đọc snapshot catalog.'));
        };
    });
}

export async function clearCachedCatalogScope(scope: CatalogCacheScope): Promise<void> {
    const database = await openPosDatabase();

    await new Promise<void>((resolve, reject) => {
        const request = database
            .transaction(POS_STORES.catalogSnapshots, 'readwrite')
            .objectStore(POS_STORES.catalogSnapshots)
            .delete(scopeKey(scope));
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error ?? new Error('Không thể xóa snapshot catalog.'));
    }).finally(() => database.close());
}
