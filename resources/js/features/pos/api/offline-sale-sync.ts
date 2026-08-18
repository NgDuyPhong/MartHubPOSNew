import { requestJson } from '@/lib/http/client';
import { HttpError } from '@/lib/http/errors';
import type { SaleReceipt } from '../model/types';
import { pendingSales, removePendingSale, saveLastReceipt, updatePendingSale, type PendingSale } from './offline-sale-repository';

let syncInProgress = false;

function errorDetails(error: unknown): { code: string; message: string; conflict: boolean } {
    if (error instanceof HttpError) {
        return { code: `HTTP_${error.status}`, message: error.message, conflict: error.status === 409 || error.status === 422 };
    }

    return { code: 'NETWORK_ERROR', message: error instanceof Error ? error.message : 'Không thể đồng bộ hóa đơn.', conflict: false };
}

async function syncOne(record: PendingSale): Promise<'synced' | 'failed' | 'conflict'> {
    await updatePendingSale(record.idempotency_key, {
        status: 'syncing',
        attempts: record.attempts + 1,
        last_attempt_at: new Date().toISOString(),
        last_error_code: null,
        last_error_message: null,
    });

    try {
        const response = await requestJson<{ sale: SaleReceipt }>(route('sales.store'), { method: 'POST', body: record.payload });
        await saveLastReceipt(response.sale);
        window.dispatchEvent(new Event('pos:receipt-updated'));
        await removePendingSale(record.idempotency_key);
        return 'synced';
    } catch (error) {
        const details = errorDetails(error);
        await updatePendingSale(record.idempotency_key, {
            status: details.conflict ? 'conflict' : 'failed',
            last_error_code: details.code,
            last_error_message: details.message,
        });
        return details.conflict ? 'conflict' : 'failed';
    }
}

export async function syncPendingSales(): Promise<{ synced: number; failed: number; conflict: number }> {
    if (syncInProgress || !navigator.onLine) return { synced: 0, failed: 0, conflict: 0 };
    syncInProgress = true;
    try {
        let synced = 0;
        let failed = 0;
        let conflict = 0;
        const records = (await pendingSales()).filter((record) => record.status === 'pending' || record.status === 'failed');

        for (const record of records) {
            const result = await syncOne(record);
            if (result === 'synced') synced++;
            if (result === 'failed') failed++;
            if (result === 'conflict') conflict++;
        }

        return { synced, failed, conflict };
    } finally {
        syncInProgress = false;
    }
}

export async function retryPendingSale(idempotencyKey: string): Promise<'synced' | 'failed' | 'conflict'> {
    const record = (await pendingSales()).find((item) => item.idempotency_key === idempotencyKey);
    if (!record) return 'failed';
    return syncOne(record);
}

export type { PendingSale };
