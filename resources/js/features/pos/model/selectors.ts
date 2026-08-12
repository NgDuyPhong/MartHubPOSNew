import type { CartLine, CartTotals, Product } from './types';

export function filterCatalog(catalog: Product[], query: string, categoryId: number | null): Product[] {
    const normalizedQuery = query.trim().toLowerCase();

    return catalog.filter((product) => {
        if (categoryId && product.category_id !== categoryId) {
            return false;
        }

        if (!normalizedQuery) {
            return true;
        }

        return (
            product.name.toLowerCase().includes(normalizedQuery) ||
            product.sku.toLowerCase().includes(normalizedQuery) ||
            product.variants.some((variant) => variant.units.some((unit) => unit.barcodes.some((barcode) => barcode.value.includes(normalizedQuery))))
        );
    });
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

export function findBarcodeMatch(
    catalog: Product[],
    barcode: string,
): { product: Product; variant: CartLine['variant']; unit: CartLine['productUnit'] } | null {
    const normalizedBarcode = barcode.trim();

    for (const product of catalog) {
        for (const variant of product.variants) {
            for (const unit of variant.units) {
                if (unit.barcodes.some((item) => item.value === normalizedBarcode)) {
                    return { product, variant, unit };
                }
            }
        }
    }

    return null;
}
