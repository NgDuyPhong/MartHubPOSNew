import { requestJson } from '@/lib/http/client';
import type { CategoryOption, Customer, PosVersions, Product, SaleReceipt, Shift } from '../model/types';
import type { PendingSalePayload } from './offline-sale-repository';

export type SalePayload = PendingSalePayload & { owner_pin?: string };

export async function createSale(payload: SalePayload): Promise<SaleReceipt> {
    const response = await requestJson<{ sale: SaleReceipt }>(route('sales.store'), {
        method: 'POST',
        body: payload,
    });

    return response.sale;
}

export type PosFreshnessResponse = { versions: PosVersions; changed: string[] };

export type PosSnapshotResponse = {
    versions: PosVersions;
    snapshotScope: { organizationId: number; branchId: number };
    schemaVersion: number;
    serverVersion: string;
    fetchedAt: string;
    catalog?: Product[];
    categories?: CategoryOption[];
    customers?: Customer[];
    activeShift?: Shift | null;
    expiryAlerts?: number;
    latestReceipt?: SaleReceipt | null;
};

export async function getPosFreshness(versions: PosVersions): Promise<PosFreshnessResponse> {
    const url = new URL(route('pos.freshness'), window.location.origin);
    Object.entries(versions).forEach(([resource, version]) => url.searchParams.set(`versions[${resource}]`, version));

    return requestJson<PosFreshnessResponse>(url.toString());
}

export async function getPosSnapshot(resources: string[]): Promise<PosSnapshotResponse> {
    const url = new URL(route('pos.snapshot'), window.location.origin);
    url.searchParams.set('resources', resources.join(','));

    return requestJson<PosSnapshotResponse>(url.toString());
}
