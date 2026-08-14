export type Unit = { id: number; code: string; name: string };

export type UnitRow = {
    id?: number;
    unit_id: number;
    conversion_to_base: number;
    sale_price: number;
    barcode: string;
    is_base: boolean;
    is_default_sale: boolean;
};

export type Product = {
    id: number;
    sku: string;
    name: string;
    category_id: number | null;
    image_path?: string;
    track_lot: boolean;
    track_expiry: boolean;
    is_active: boolean;
    updated_at?: string;
    category?: { name: string };
    variants: Array<{
        last_cost_base: number;
        units: Array<{
            id: number;
            sale_price: number;
            conversion_to_base: string;
            is_base: boolean;
            is_default_sale: boolean;
            unit: Unit;
            barcodes: Array<{ value: string }>;
        }>;
        balances: Array<{ quantity_base: string }>;
    }>;
};

export type ProductFormData = {
    name: string;
    sku: string;
    category_id: number | '';
    image: File | null;
    track_lot: boolean;
    track_expiry: boolean;
    is_active: boolean;
    units: UnitRow[];
};
