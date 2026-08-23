export type ProductUnit = {
    id: number;
    unit: { code: string; name: string };
    barcodes: Array<{ value: string }>;
    variant: { product: { name: string; sku: string; track_lot: boolean; track_expiry: boolean } };
};

export type StockReceiptRow = {
    product_unit_id: number;
    quantity: number;
    unit_cost: number | '';
    lot_number: string;
    expiry_date: string;
};

export type StockReceiptFormData = {
    source: 'manual' | 'excel';
    supplier_name: string;
    note: string;
    items: StockReceiptRow[];
};
