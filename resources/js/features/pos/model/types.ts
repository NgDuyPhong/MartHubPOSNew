export type ProductUnit = {
    id: number;
    conversion_to_base: string;
    sale_price: number;
    is_default_sale: boolean;
    unit: { code: string; name: string };
    barcodes: Array<{ value: string }>;
};

export type Variant = { id: number; name: string; units: ProductUnit[]; balances: Array<{ quantity_base: string }> };

export type Product = {
    id: number;
    sku: string;
    name: string;
    image_path?: string;
    category_id: number | null;
    updated_at?: string;
    category?: { name: string; color?: string };
    variants: Variant[];
};

export type Customer = { id: number; code: string; name: string; phone?: string; balance: number };

export type Shift = { id: number; code: string; opening_cash: number; register: { name: string } };

export type CartLine = {
    key: string;
    product: Product;
    variant: Variant;
    productUnit: ProductUnit;
    quantity: number;
    unitPrice: number;
    discount: number;
};

export type SaleReceipt = {
    invoice_number: string;
    sold_at: string;
    subtotal: number;
    discount_amount: number;
    total: number;
    paid_amount: number;
    debt_amount: number;
    change_amount: number;
    items: Array<{ id: number; product_name: string; quantity: string; unit_name: string; unit_price: number; line_total: number }>;
};

export type CartTotals = {
    subtotal: number;
    discount: number;
    total: number;
    paid: number;
    debt: number;
    changeAmount: number;
};
