import { requestJson } from '@/lib/http/client';
import { pendingSales, removePendingSale, type PendingSale } from './offline-sale-repository';

export async function syncPendingSales(): Promise<{ synced: number; failed: number }> {
    let synced = 0;
    let failed = 0;

    for (const sale of await pendingSales()) {
        try {
            await requestJson(route('sales.store'), { method: 'POST', body: sale });
            await removePendingSale(sale.idempotency_key);
            synced++;
        } catch {
            failed++;
        }
    }

    return { synced, failed };
}

export type { PendingSale };
