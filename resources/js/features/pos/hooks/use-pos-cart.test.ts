import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { CartLine, Product, ProductUnit, Variant } from '../model/types';
import { validateCheckout } from '../model/validation';
import { getCartLineKey, replaceCartLineSelection, usePosCart } from './use-pos-cart';

function makeUnit(id: number, name: string, salePrice: number, conversionToBase = 1): ProductUnit {
    return {
        id,
        conversion_to_base: String(conversionToBase),
        sale_price: salePrice,
        is_default_sale: id === 1,
        allows_fractional_quantity: false,
        unit: { code: name.toUpperCase(), name },
        barcodes: [],
    };
}

function makeProduct(): { product: Product; variant: Variant; lon: ProductUnit; loc: ProductUnit } {
    const lon = makeUnit(1, 'Lon', 8000);
    const loc = makeUnit(2, 'Lốc', 90000, 6);
    const variant: Variant = { id: 10, name: 'Vị nguyên bản', units: [lon, loc], balances: [{ quantity_base: '60' }] };
    const product: Product = {
        id: 100,
        sku: 'COCA-001',
        name: 'Coca-Cola',
        category_id: null,
        variants: [variant],
    };

    return { product, variant, lon, loc };
}

function makeLine(product: Product, variant: Variant, productUnit: ProductUnit, values: Partial<CartLine> = {}): CartLine {
    return {
        key: getCartLineKey(variant, productUnit),
        product,
        variant,
        productUnit,
        quantity: 1,
        unitPrice: productUnit.sale_price,
        discount: 0,
        ...values,
    };
}

describe('replaceCartLineSelection', () => {
    it('changes one unit while keeping the quantity and resetting line pricing', () => {
        const { product, variant, lon, loc } = makeProduct();
        const cart = [makeLine(product, variant, lon, { quantity: 1, unitPrice: 7500, discount: 500 })];

        const nextCart = replaceCartLineSelection(cart, cart[0].key, product, variant, loc);

        expect(nextCart).toEqual([
            expect.objectContaining({
                key: getCartLineKey(variant, loc),
                productUnit: loc,
                quantity: 1,
                unitPrice: 90000,
                discount: 0,
            }),
        ]);
    });

    it('merges into an existing destination unit and keeps destination pricing', () => {
        const { product, variant, lon, loc } = makeProduct();
        const source = makeLine(product, variant, lon, { quantity: 1, unitPrice: 7500, discount: 500 });
        const destination = makeLine(product, variant, loc, { quantity: 2, unitPrice: 88000, discount: 1000 });

        const nextCart = replaceCartLineSelection([source, destination], source.key, product, variant, loc);

        expect(nextCart).toHaveLength(1);
        expect(nextCart[0]).toEqual(expect.objectContaining({ key: destination.key, quantity: 3, unitPrice: 88000, discount: 1000 }));
    });

    it('is a no-op for the current unit or an unknown line', () => {
        const { product, variant, lon, loc } = makeProduct();
        const cart = [makeLine(product, variant, lon)];

        expect(replaceCartLineSelection(cart, cart[0].key, product, variant, lon)).toBe(cart);
        expect(replaceCartLineSelection(cart, 'missing', product, variant, loc)).toBe(cart);
    });

    it('updates selectedKey after replacing or merging a cart line', () => {
        const { product, variant, lon, loc } = makeProduct();
        const { result } = renderHook(() => usePosCart());

        act(() => result.current.addLine(product, variant, lon));
        const sourceKey = getCartLineKey(variant, lon);

        act(() => result.current.changeLineSelection(sourceKey, product, variant, loc));

        expect(result.current.selectedKey).toBe(getCartLineKey(variant, loc));
        expect(result.current.cart[0]?.productUnit.id).toBe(loc.id);

        act(() => result.current.addLine(product, variant, lon));
        act(() => result.current.changeLineSelection(getCartLineKey(variant, lon), product, variant, loc));

        expect(result.current.selectedKey).toBe(getCartLineKey(variant, loc));
        expect(result.current.cart).toHaveLength(1);
        expect(result.current.cart[0]?.quantity).toBe(2);
    });

    it('uses the replacement unit quantity policy for checkout validation', () => {
        const { product, variant, lon, loc } = makeProduct();
        const fractionalLoc = { ...loc, allows_fractional_quantity: true };
        const { result } = renderHook(() => usePosCart());

        act(() => result.current.addLine(product, variant, lon));
        act(() => result.current.changeLineSelection(getCartLineKey(variant, lon), product, variant, fractionalLoc));

        const line = result.current.cart[0];
        expect(line?.productUnit.allows_fractional_quantity).toBe(true);
        const errors = validateCheckout({
            cart: line ? [{ ...line, quantity: 0.5 }] : [],
            cash: 0,
            qr: 0,
            total: 100,
            debt: 100,
            customerId: 1,
            qrConfirmed: false,
            online: true,
            overrideNeeded: false,
            unavailableCartLineCount: 0,
        });

        expect(errors.quantity).toBeUndefined();
    });
});
