import type { CartLine, CartTotals, Product } from './types';
import { normalizeVietnamese } from '@/lib/vietnamese-search';

export type BarcodeMatch = { product: Product; variant: CartLine['variant']; unit: CartLine['productUnit'] };

export type CatalogSearchIndex = {
    products: Product[];
    records: Array<{ product: Product; searchableText: string }>;
    barcodeMatches: Map<string, BarcodeMatch>;
};

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
    const subtotal = cart.reduce((sum, line) => sum + Math.round(line.unitPrice * line.quantity), 0);
    const discount = cart.reduce((sum, line) => sum + line.discount, 0);
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

export function requiresOwnerOverride(cart: CartLine[]): boolean {
    return cart.some((line) => line.unitPrice !== line.productUnit.sale_price || line.discount > 0);
}

export function findBarcodeMatch(catalog: Product[], barcode: string): BarcodeMatch | null {
    return findBarcodeMatchWithIndex(buildCatalogSearchIndex(catalog), barcode);
}

export function findBarcodeMatchWithIndex(index: CatalogSearchIndex, barcode: string): BarcodeMatch | null {
    return index.barcodeMatches.get(normalizeBarcode(barcode)) ?? null;
}
