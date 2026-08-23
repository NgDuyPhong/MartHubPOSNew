import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { ProductQuickEditSheet } from './product-quick-edit-sheet';

describe('ProductQuickEditSheet', () => {
    it('places the sale price before the category field', () => {
        render(
            <ProductQuickEditSheet
                open
                online={false}
                onOpenChange={() => undefined}
                categories={[{ id: 1, name: 'Nước uống' }]}
                product={{
                    id: 1,
                    name: 'Nước suối',
                    sku: 'NS-001',
                    category_id: 1,
                    category: { name: 'Nước uống' },
                    updated_at: '2026-08-20T00:00:00Z',
                    variants: [{ units: [{ id: 10, sale_price: 10000, is_default_sale: true, unit: { name: 'Chai' } }] }],
                }}
                unitId={10}
            />,
        );

        const price = screen.getByLabelText(/Giá bán/);
        const category = screen.getByLabelText('Danh mục');

        expect(price.compareDocumentPosition(category) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('closes when Escape is pressed', async () => {
        const user = userEvent.setup();
        const onOpenChange = vi.fn();

        render(<ProductQuickEditSheet open online={false} onOpenChange={onOpenChange} categories={[]} product={null} />);

        await user.keyboard('{Escape}');

        expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it('returns focus to the external trigger when closed', async () => {
        const user = userEvent.setup();

        function Harness() {
            const [open, setOpen] = useState(false);

            return (
                <>
                    <button type="button" onClick={() => setOpen(true)}>
                        Mở sửa nhanh
                    </button>
                    <ProductQuickEditSheet open={open} online={false} onOpenChange={setOpen} categories={[]} product={null} />
                </>
            );
        }

        render(<Harness />);
        const trigger = screen.getByRole('button', { name: 'Mở sửa nhanh' });

        await user.click(trigger);
        await user.keyboard('{Escape}');

        expect(trigger).toHaveFocus();
    });
});
