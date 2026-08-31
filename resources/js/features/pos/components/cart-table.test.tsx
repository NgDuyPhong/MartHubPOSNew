import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { CartReconciliation } from '../model/selectors';
import type { CartLine, Product, ProductUnit, Variant } from '../model/types';
import { CartTable } from './cart-table';

function makeFixture(multipleUnits = true): {
    product: Product;
    variant: Variant;
    lon: ProductUnit;
    loc: ProductUnit;
    line: CartLine;
    reconciliation: CartReconciliation;
} {
    const lon: ProductUnit = {
        id: 1,
        conversion_to_base: '1',
        sale_price: 8000,
        is_default_sale: true,
        allows_fractional_quantity: false,
        unit: { code: 'LON', name: 'Lon' },
        barcodes: [],
    };
    const loc: ProductUnit = {
        id: 2,
        conversion_to_base: '6',
        sale_price: 90000,
        is_default_sale: false,
        allows_fractional_quantity: false,
        unit: { code: 'LOC', name: 'Lốc' },
        barcodes: [],
    };
    const variant: Variant = { id: 10, name: 'Vị nguyên bản', units: multipleUnits ? [lon, loc] : [lon], balances: [{ quantity_base: '60' }] };
    const product: Product = { id: 100, sku: 'COCA-001', name: 'Coca-Cola', category_id: null, variants: [variant] };
    const line: CartLine = { key: '10-1', product, variant, productUnit: lon, quantity: 1, unitPrice: 8000, discount: 0 };
    const reconciliation: CartReconciliation = {
        [line.key]: { status: 'available', product, variant, productUnit: lon },
    };

    return { product, variant, lon, loc, line, reconciliation };
}

describe('CartTable unit selection', () => {
    it('exposes a direct action for products with multiple sellable units', async () => {
        const user = userEvent.setup();
        const fixture = makeFixture();
        const onSelect = vi.fn();
        const onChangeSelection = vi.fn();

        render(
            <CartTable
                cart={[fixture.line]}
                reconciliation={fixture.reconciliation}
                selectedKey={fixture.line.key}
                online={false}
                onSelect={onSelect}
                onClear={vi.fn()}
                onUpdate={vi.fn()}
                onChangeSelection={onChangeSelection}
                onRemove={vi.fn()}
            />,
        );

        const changeButton = screen.getByRole('button', { name: 'Đổi quy cách bán cho Coca-Cola, hiện tại Lon' });
        await user.click(changeButton);

        expect(onSelect).toHaveBeenCalledOnce();
        expect(onChangeSelection).toHaveBeenCalledWith(fixture.line, fixture.product);
    });

    it.each(['{Enter}', '[Space]'] as const)('activates the unit button with %s without selecting the row twice', async (key) => {
        const user = userEvent.setup();
        const fixture = makeFixture();
        const onSelect = vi.fn();
        const onChangeSelection = vi.fn();

        render(
            <CartTable
                cart={[fixture.line]}
                reconciliation={fixture.reconciliation}
                selectedKey={fixture.line.key}
                online={false}
                onSelect={onSelect}
                onClear={vi.fn()}
                onUpdate={vi.fn()}
                onChangeSelection={onChangeSelection}
                onRemove={vi.fn()}
            />,
        );

        const changeButton = screen.getByRole('button', { name: 'Đổi quy cách bán cho Coca-Cola, hiện tại Lon' });
        changeButton.focus();
        await user.keyboard(key);

        expect(onSelect).toHaveBeenCalledOnce();
        expect(onChangeSelection).toHaveBeenCalledOnce();
    });

    it('does not render a unit change action when only one unit is sellable', () => {
        const fixture = makeFixture(false);

        render(
            <CartTable
                cart={[fixture.line]}
                reconciliation={fixture.reconciliation}
                selectedKey={fixture.line.key}
                online={false}
                onSelect={vi.fn()}
                onClear={vi.fn()}
                onUpdate={vi.fn()}
                onChangeSelection={vi.fn()}
                onRemove={vi.fn()}
            />,
        );

        expect(screen.queryByRole('button', { name: /Đổi quy cách bán/ })).not.toBeInTheDocument();
    });
});
