export type SaleItem = {
    id: number;
    product_name: string;
    product_sku: string;
    variant_name?: string;
    unit_name: string;
    unit_code?: string;
    quantity: string;
    unit_price: number;
    original_unit_price?: number;
    discount_amount: number;
    line_total: number;
    price_overridden: boolean;
    return_items: Array<{ quantity: string }>;
};

export type ReturnItemDraft = { sale_item_id: number; quantity: number; condition: string };
export type ReturnFormData = { shift_id: number; type: string; refund_method: string; reason: string; items: ReturnItemDraft[] };
