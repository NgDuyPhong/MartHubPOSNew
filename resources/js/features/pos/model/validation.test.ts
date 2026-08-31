import { describe, expect, it } from 'vitest';
import type { CartLine } from './types';
import { validateCheckout } from './validation';

function makeLine(allowsFractionalQuantity: boolean): CartLine {
    const productUnit = {
        id: 2,
        conversion_to_base: '6',
        sale_price: 90000,
        is_default_sale: true,
        allows_fractional_quantity: allowsFractionalQuantity,
        unit: { code: 'LOC', name: 'Lốc' },
        barcodes: [],
    };
    const variant = { id: 10, name: 'Vị nguyên bản', units: [productUnit], balances: [{ quantity_base: '60' }] };
    const product = { id: 100, sku: 'COCA-001', name: 'Coca-Cola', category_id: null, variants: [variant] };

    return { key: '10-2', product, variant, productUnit, quantity: 0.5, unitPrice: 90000, discount: 0 };
}

function validate(line: CartLine) {
    return validateCheckout({
        cart: [line],
        cash: 0,
        qr: 0,
        total: 45000,
        debt: 45000,
        customerId: 1,
        qrConfirmed: false,
        online: true,
        overrideNeeded: false,
        unavailableCartLineCount: 0,
    });
}

describe('validateCheckout quantity policy', () => {
    it('accepts fractional quantity for a unit that allows it', () => {
        expect(validate(makeLine(true)).quantity).toBeUndefined();
    });

    it('rejects fractional quantity for a packaged unit', () => {
        expect(validate(makeLine(false)).quantity).toBe('Đơn vị Lốc chỉ nhận số lượng nguyên.');
    });
});
