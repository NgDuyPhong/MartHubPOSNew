import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ProductUnitsEditor } from './product-units-editor';

describe('ProductUnitsEditor default sale unit', () => {
    it('sorts and highlights the default row while preserving original indexes', () => {
        const setData = vi.fn();
        const updateUnit = vi.fn();
        const rows = [
            {
                id: 10,
                unit_id: 1,
                conversion_to_base: 1,
                sale_price: 10000,
                barcode: 'BASE-001',
                is_base: true,
                is_default_sale: false,
                allows_fractional_quantity: false,
            },
            {
                id: 20,
                unit_id: 2,
                conversion_to_base: 12,
                sale_price: 120000,
                barcode: 'BOX-012',
                is_base: false,
                is_default_sale: true,
                allows_fractional_quantity: false,
            },
        ];

        render(
            <ProductUnitsEditor
                form={{ data: { units: rows }, errors: {}, setData, processing: false } as never}
                units={[
                    { id: 1, code: 'CH', name: 'Chai' },
                    { id: 2, code: 'TH', name: 'Thùng' },
                ]}
                firstUnit={1}
                updateUnit={updateUnit}
                chooseExclusive={vi.fn()}
            />,
        );

        const barcodeInputs = screen.getAllByLabelText('Barcode') as HTMLInputElement[];
        expect(barcodeInputs.map((input) => input.value)).toEqual(['BOX-012', 'BASE-001']);
        expect(barcodeInputs[0].closest('.space-y-3')).toHaveClass('border-primary/50', 'bg-primary/5');

        fireEvent.change(barcodeInputs[0], { target: { value: 'BOX-013' } });
        expect(updateUnit).toHaveBeenCalledWith(1, { barcode: 'BOX-013' });

        fireEvent.click(screen.getAllByRole('button', { name: 'Xóa đơn vị' })[0]);
        expect(setData).toHaveBeenCalledWith('units', [rows[0]]);
    });
});
