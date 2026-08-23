import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProductTable } from './product-table';

describe('ProductTable price action', () => {
    beforeEach(() => {
        vi.stubGlobal('route', (name: string, id: number) => `/${name}/${id}`);
    });

    it('explains why quick price edit is disabled without a default sale unit', () => {
        render(
            <ProductTable
                products={[
                    {
                        id: 1,
                        sku: 'NS-001',
                        name: 'Nước suối',
                        category_id: null,
                        track_lot: false,
                        track_expiry: false,
                        is_active: true,
                        variants: [
                            {
                                last_cost_base: 0,
                                units: [
                                    {
                                        id: 10,
                                        sale_price: 10000,
                                        conversion_to_base: '1',
                                        is_base: true,
                                        is_default_sale: false,
                                        allows_fractional_quantity: false,
                                        unit: { id: 1, code: 'CH', name: 'Chai' },
                                        barcodes: [],
                                    },
                                ],
                                balances: [{ quantity_base: '0' }],
                            },
                        ],
                    },
                ]}
                onStatus={vi.fn()}
                onQuickEdit={vi.fn()}
                canManageCatalog
            />,
        );

        const priceButton = screen.getByRole('button', { name: /Không thể sửa giá/ });
        expect(priceButton).toBeDisabled();
        expect(priceButton).toHaveAttribute('title', 'Sản phẩm chưa có đơn vị bán mặc định');
    });

    it('opens quick edit with the active default sale unit', async () => {
        const onQuickEdit = vi.fn();

        render(
            <ProductTable
                products={[
                    {
                        id: 2,
                        sku: 'NS-002',
                        name: 'Nước suối 2',
                        category_id: null,
                        track_lot: false,
                        track_expiry: false,
                        is_active: true,
                        variants: [
                            {
                                last_cost_base: 0,
                                units: [
                                    {
                                        id: 20,
                                        sale_price: 12000,
                                        conversion_to_base: '1',
                                        is_base: true,
                                        is_default_sale: true,
                                        allows_fractional_quantity: false,
                                        unit: { id: 1, code: 'CH', name: 'Chai' },
                                        barcodes: [],
                                    },
                                ],
                                balances: [{ quantity_base: '0' }],
                            },
                        ],
                    },
                ]}
                onStatus={vi.fn()}
                onQuickEdit={onQuickEdit}
                canManageCatalog
            />,
        );

        await userEvent.setup().click(screen.getByRole('button', { name: 'Sửa giá Nước suối 2' }));

        expect(onQuickEdit).toHaveBeenCalledWith(expect.objectContaining({ id: 2 }), 20);
    });
});
