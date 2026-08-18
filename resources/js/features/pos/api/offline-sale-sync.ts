import { requestJson } from '@/lib/http/client';
import { firstValidationMessage, HttpError } from '@/lib/http/errors';
import type { SaleReceipt } from '../model/types';
import {
    pendingSales,
    PRICE_REPRICE_REQUIRED_CODE,
    removePendingSale,
    saveLastReceipt,
    updatePendingSale,
    type PendingSale,
} from './offline-sale-repository';

let syncInProgress = false;

function errorDetails(error: unknown, record: PendingSale): { code: string; message: string; conflict: boolean } {
    if (error instanceof HttpError) {
        const validationMessage = firstValidationMessage(error);
        const requiresReprice =
            record.payload.source === 'offline_sync' &&
            error.status === 422 &&
            Object.keys(error.validationErrors).some((key) => key === 'owner_pin');

        return {
            code: requiresReprice ? PRICE_REPRICE_REQUIRED_CODE : `HTTP_${error.status}`,
            message: validationMessage ?? error.message,
            conflict: error.status === 409 || error.status === 422,
        };
    }

    return { code: 'NETWORK_ERROR', message: error instanceof Error ? error.message : 'Không thể đồng bộ hóa đơn.', conflict: false };
}

async function syncOne(record: PendingSale, scopeKey: string): Promise<'synced' | 'failed' | 'conflict'> {
    await updatePendingSale(record.idempotency_key, {
        status: 'syncing',
        attempts: record.attempts + 1,
        last_attempt_at: new Date().toISOString(),
        last_error_code: null,
        last_error_message: null,
    });

    try {
        const response = await requestJson<{ sale: SaleReceipt }>(route('sales.store'), { method: 'POST', body: record.payload });
        await saveLastReceipt(response.sale, scopeKey);
        window.dispatchEvent(new Event('pos:receipt-updated'));
        await removePendingSale(record.idempotency_key);
        return 'synced';
    } catch (error) {
        const details = errorDetails(error, record);
        await updatePendingSale(record.idempotency_key, {
            status: details.conflict ? 'conflict' : 'failed',
            last_error_code: details.code,
            last_error_message: details.message,
        });
        return details.conflict ? 'conflict' : 'failed';
    }
}

export async function syncPendingSales(scopeKey: string): Promise<{ synced: number; failed: number; conflict: number }> {
    if (syncInProgress || !navigator.onLine) return { synced: 0, failed: 0, conflict: 0 };
    syncInProgress = true;
    try {
        let synced = 0;
        let failed = 0;
        let conflict = 0;
        const records = (await pendingSales(scopeKey)).filter((record) => record.status === 'pending' || record.status === 'failed');

        for (const record of records) {
            const result = await syncOne(record, scopeKey);
            if (result === 'synced') synced++;
            if (result === 'failed') failed++;
            if (result === 'conflict') conflict++;
        }

        return { synced, failed, conflict };
    } finally {
        syncInProgress = false;
    }
}

export async function retryPendingSale(idempotencyKey: string, scopeKey: string): Promise<'synced' | 'failed' | 'conflict'> {
    const record = (await pendingSales(scopeKey)).find((item) => item.idempotency_key === idempotencyKey);
    if (!record) return 'failed';
    return syncOne(record, scopeKey);
}

export type { PendingSale };
