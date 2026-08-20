import { normalizeVietnamese } from '@/lib/vietnamese-search';
import type { CartLine, CartTotals, Product, ProductUnit, Variant } from './types';

export type BarcodeMatch = { product: Product; variant: CartLine['variant']; unit: CartLine['productUnit'] };

export type CatalogSearchIndex = {
    products: Product[];
    records: Array<{ product: Product; searchableText: string }>;
    barcodeMatches: Map<string, BarcodeMatch>;
};

export type CartLineReconciliationStatus = 'available' | 'price_changed' | 'unavailable';

export type CartLineReconciliation = {
    status: CartLineReconciliationStatus;
    product?: Product;
    variant?: Variant;
    productUnit?: ProductUnit;
};

export type CartReconciliation = Record<string, CartLineReconciliation>;

/**
 * Stable catalog identity used to keep the search index across Inertia prop
 * refreshes that recreate the catalog array without changing its records.
 */
export function getCatalogVersion(catalog: Product[]): string {
    return catalog
        .map((product) => {
            const variants = product.variants
                .map((variant) => {
                    const units = variant.units
                        .map((unit) => {
                            const barcodes = unit.barcodes.map((barcode) => `${barcode.value}:${barcode.updated_at ?? ''}`).join(',');
                            return `${unit.id}:${unit.updated_at ?? ''}:${unit.conversion_to_base}:${unit.sale_price}:${unit.is_default_sale}:${unit.allows_fractional_quantity}:${unit.unit.code}:${unit.unit.name}:${barcodes}`;
                        })
                        .join(',');
                    const balances = variant.balances.map((balance) => balance.quantity_base).join(',');

                    return `${variant.id}:${variant.updated_at ?? ''}:${variant.name}:${units}:${balances}`;
                })
                .join(';');

            return `${product.id}:${product.updated_at ?? ''}:${product.sku}:${product.name}:${product.image_path ?? ''}:${product.category_id ?? ''}:${product.category?.name ?? ''}:${product.category?.color ?? ''}:${variants}`;
        })
        .join('|');
}

function normalizeBarcode(value: string): string {
    return value.trim().toLowerCase();
}

export function buildCatalogSearchIndex(catalog: Product[]): CatalogSearchIndex {
    const barcodeMatches = new Map<string, BarcodeMatch>();
    const records = catalog.map((product) => {
        const barcodes = product.variants.flatMap((variant) =>
            variant.units.flatMap((unit) =>
                unit.barcodes.map((barcode) => {
                    const value = normalizeBarcode(barcode.value);
                    const match = { product, variant, unit };

                    if (value && !barcodeMatches.has(value)) {
                        barcodeMatches.set(value, match);
                    }

                    return value;
                }),
            ),
        );

        return {
            product,
            searchableText: [product.name, product.sku, ...barcodes].map(normalizeVietnamese).join(' '),
        };
    });

    return { products: catalog, records, barcodeMatches };
}

export function filterCatalogWithIndex(index: CatalogSearchIndex, query: string, categoryId: number | null): Product[] {
    const normalizedQuery = normalizeVietnamese(query);

    return index.records
        .filter(({ product, searchableText }) => {
            if (categoryId !== null && product.category_id !== categoryId) {
                return false;
            }

            return !normalizedQuery || searchableText.includes(normalizedQuery);
        })
        .map(({ product }) => product);
}

export function filterCatalog(catalog: Product[], query: string, categoryId: number | null): Product[] {
    return filterCatalogWithIndex(buildCatalogSearchIndex(catalog), query, categoryId);
}

export function calculateCartTotals(cart: CartLine[], cash: number, qr: number): CartTotals {
    const subtotal = cart.reduce((sum, line) => sum + Math.round(Math.max(0, line.unitPrice) * Math.max(0, line.quantity)), 0);
    const discount = cart.reduce((sum, line) => sum + Math.max(0, line.discount), 0);
    const total = Math.max(0, subtotal - discount);
    const paid = Math.min(total, Math.max(0, cash) + Math.max(0, qr));

    return {
        subtotal,
        discount,
        total,
        paid,
        debt: total - paid,
        changeAmount: Math.max(0, cash + qr - total),
    };
}

export function reconcileCartWithCatalog(cart: CartLine[], catalog: Product[]): CartReconciliation {
    const unitsById = new Map<number, { product: Product; variant: Variant; productUnit: ProductUnit }>();

    for (const product of catalog) {
        for (const variant of product.variants) {
            for (const productUnit of variant.units) {
                unitsById.set(productUnit.id, { product, variant, productUnit });
            }
        }
    }

    return Object.fromEntries(
        cart.map((line) => {
            const current = unitsById.get(line.productUnit.id);

            if (!current) {
                return [line.key, { status: 'unavailable' as const }];
            }

            return [
                line.key,
                {
                    status: current.productUnit.sale_price !== line.productUnit.sale_price ? ('price_changed' as const) : ('available' as const),
                    ...current,
                },
            ];
        }),
    );
}

export function getDefaultSellableSelection(product: Product): { variant: CartLine['variant']; unit: CartLine['productUnit'] } | null {
    const variants = product.variants.filter((variant) => variant.units.length > 0);
    if (variants.length !== 1 || variants[0].units.length !== 1) {
        return null;
    }

    const variant = variants[0];
    const unit = variant.units.find((item) => item.is_default_sale) ?? (variant.units.length === 1 ? variant.units[0] : null);

    return unit ? { variant, unit } : null;
}

export function requiresOwnerOverride(cart: CartLine[]): boolean {
    return cart.some((line) => line.unitPrice !== line.productUnit.sale_price || line.discount > 0);
}

export function hasStalePriceOverride(cart: CartLine[], catalog: Product[]): boolean {
    return cart.some((line) => {
        const currentUnit = catalog
            .flatMap((product) => product.variants.flatMap((variant) => variant.units))
            .find((unit) => unit.id === line.productUnit.id);

        return currentUnit !== undefined && currentUnit.sale_price !== line.unitPrice;
    });
}

export function findBarcodeMatch(catalog: Product[], barcode: string): BarcodeMatch | null {
    return findBarcodeMatchWithIndex(buildCatalogSearchIndex(catalog), barcode);
}

export function findBarcodeMatchWithIndex(index: CatalogSearchIndex, barcode: string): BarcodeMatch | null {
    return index.barcodeMatches.get(normalizeBarcode(barcode)) ?? null;
}
