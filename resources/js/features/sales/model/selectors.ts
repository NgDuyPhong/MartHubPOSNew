import type { ReturnItemDraft, SaleItem } from './types';

export function remainingReturnQuantity(item: SaleItem): number {
    const returned = item.return_items.reduce((sum, row) => sum + Number(row.quantity), 0);
    return Math.max(0, Number(item.quantity) - returned);
}

export function updateReturnItem(items: ReturnItemDraft[], index: number, values: Partial<ReturnItemDraft>): ReturnItemDraft[] {
    return items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...values } : item));
}

export function nonEmptyReturnItems(items: ReturnItemDraft[]): ReturnItemDraft[] {
    return items.filter((item) => Number(item.quantity) > 0);
}
