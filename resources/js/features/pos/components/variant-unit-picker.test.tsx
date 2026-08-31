import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Product, ProductUnit, Variant } from '../model/types';
import { VariantUnitPicker } from './variant-unit-picker';

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
const variant: Variant = { id: 10, name: 'Vị nguyên bản', units: [lon, loc], balances: [{ quantity_base: '60' }] };
const product: Product = { id: 100, sku: 'COCA-001', name: 'Coca-Cola', category_id: null, variants: [variant] };

describe('VariantUnitPicker', () => {
    it('supports replace mode and selects a different unit', async () => {
        const user = userEvent.setup();
        const onSelect = vi.fn();

        render(<VariantUnitPicker product={product} open onOpenChange={vi.fn()} onSelect={onSelect} mode="replace" selectedUnitId={lon.id} />);

        expect(screen.getByRole('heading', { name: 'Đổi quy cách bán' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Lon/ })).toBeDisabled();

        await user.click(screen.getByRole('button', { name: /Lốc/ }));

        expect(onSelect).toHaveBeenCalledWith(product, variant, loc);
    });
});
