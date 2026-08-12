import { requestJson } from '@/lib/http/client';
import type { SaleReceipt } from '../model/types';
import type { PendingSale } from './offline-sale-repository';

export type SalePayload = PendingSale & { owner_pin?: string };

export async function createSale(payload: SalePayload): Promise<SaleReceipt> {
    const response = await requestJson<{ sale: SaleReceipt }>(route('sales.store'), {
        method: 'POST',
        body: payload,
    });

    return response.sale;
}
