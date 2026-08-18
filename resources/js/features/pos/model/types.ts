export type ProductUnit = {
    id: number;
    updated_at?: string;
    conversion_to_base: string;
    sale_price: number;
    is_default_sale: boolean;
    allows_fractional_quantity: boolean;
    unit: { code: string; name: string };
    barcodes: Array<{ value: string; updated_at?: string }>;
};

export type Variant = { id: number; name: string; updated_at?: string; units: ProductUnit[]; balances: Array<{ quantity_base: string }> };

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

export type Shift = {
    id: number;
    code: string;
    opening_cash: number;
    opened_at?: string;
    opened_by?: { name: string } | null;
    register: { name: string };
};

export type CartLine = {
    key: string;
    product: Product;
    variant: Variant;
    productUnit: ProductUnit;
    quantity: number;
    unitPrice: number;
    discount: number;
};

export type CheckoutDraftSnapshot = {
    customerId: number | null;
    cash: number;
    qr: number;
    qrConfirmed: boolean;
};

export type CartDraft = {
    id: string;
    name: string;
    cart: CartLine[];
    checkout: CheckoutDraftSnapshot;
    active: boolean;
    updatedAt: string;
};

export type SaleReceipt = {
    id?: number;
    invoice_number: string;
    sold_at: string;
    source?: 'online' | 'offline_sync';
    status?: string;
    branch_name?: string;
    shift_code?: string;
    cashier_name?: string;
    customer_name?: string;
    note?: string | null;
    synced_at?: string | null;
    subtotal: number;
    discount_amount: number;
    total: number;
    paid_amount: number;
    debt_amount: number;
    change_amount: number;
    items: Array<{
        id: number;
        product_name: string;
        variant_name?: string;
        product_sku?: string;
        quantity: string;
        unit_name: string;
        unit_code?: string;
        unit_price: number;
        original_unit_price?: number;
        discount_amount?: number;
        line_total: number;
    }>;
    payments?: Array<{ method: string; amount: number }>;
};

export type CartTotals = {
    subtotal: number;
    discount: number;
    total: number;
    paid: number;
    debt: number;
    changeAmount: number;
};
