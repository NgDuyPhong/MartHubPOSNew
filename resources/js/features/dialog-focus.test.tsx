import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useEffect, useState, type ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import { CustomerFormDialog } from './customers/components/customer-form-dialog';
import { DebtPaymentDialog } from './customers/components/debt-payment-dialog';
import { ReturnDialog } from './sales/components/return-dialog';
import { CashMovementDialog } from './shifts/components/cash-movement-dialog';
import { CloseShiftDialog } from './shifts/components/close-shift-dialog';

type DialogRenderer = (open: boolean, onOpenChange: (open: boolean) => void) => ReactNode;

async function expectFocusAfterCancel(renderDialog: DialogRenderer) {
    const user = userEvent.setup();

    function Harness() {
        const [open, setOpen] = useState(false);

        return (
            <>
                <button type="button" onClick={() => setOpen(true)}>
                    Mở dialog
                </button>
                {renderDialog(open, setOpen)}
            </>
        );
    }

    render(<Harness />);
    const trigger = screen.getByRole('button', { name: 'Mở dialog' });

    await user.click(trigger);
    await user.click(screen.getByRole('button', { name: 'Hủy' }));

    expect(trigger).toHaveFocus();
}

async function expectFocusAfterParentClose(renderDialog: DialogRenderer) {
    const user = userEvent.setup();

    function Harness() {
        const [open, setOpen] = useState(false);

        useEffect(() => {
            if (!open) return;

            const timer = window.setTimeout(() => setOpen(false), 0);
            return () => window.clearTimeout(timer);
        }, [open]);

        return (
            <>
                <button type="button" onClick={() => setOpen(true)}>
                    Mở dialog
                </button>
                {renderDialog(open, setOpen)}
            </>
        );
    }

    render(<Harness />);
    const trigger = screen.getByRole('button', { name: 'Mở dialog' });

    await user.click(trigger);
    await waitFor(() => expect(trigger).toHaveFocus());
}

describe('controlled dialog focus restoration', () => {
    it('restores focus when the parent closes after a successful submit', async () => {
        await expectFocusAfterParentClose((open, onOpenChange) => (
            <CustomerFormDialog
                open={open}
                onOpenChange={onOpenChange}
                form={{ data: { name: '', phone: '', address: '', note: '' }, errors: {}, processing: false } as never}
                onSubmit={() => undefined}
            />
        ));
    });

    it('restores focus for customer form', async () => {
        await expectFocusAfterCancel((open, onOpenChange) => (
            <CustomerFormDialog
                open={open}
                onOpenChange={onOpenChange}
                form={{ data: { name: '', phone: '', address: '', note: '' }, errors: {}, processing: false } as never}
                onSubmit={() => undefined}
            />
        ));
    });

    it('restores focus for debt payment', async () => {
        await expectFocusAfterCancel((open, onOpenChange) => (
            <DebtPaymentDialog
                open={open}
                onOpenChange={onOpenChange}
                customer={null}
                activeShift={null}
                form={
                    {
                        data: { shift_id: 0, method: 'cash', amount: '', reference: '', manually_confirmed: false, note: '' },
                        errors: {},
                        processing: false,
                    } as never
                }
                onSubmit={() => undefined}
            />
        ));
    });

    it('restores focus for cash movement', async () => {
        await expectFocusAfterCancel((open, onOpenChange) => (
            <CashMovementDialog
                open={open}
                onOpenChange={onOpenChange}
                form={{ data: { type: 'in', amount: '', reason: '' }, errors: {}, processing: false } as never}
                onSubmit={() => undefined}
            />
        ));
    });

    it('restores focus for closing a shift', async () => {
        await expectFocusAfterCancel((open, onOpenChange) => (
            <CloseShiftDialog
                open={open}
                onOpenChange={onOpenChange}
                form={{ data: { actual_cash: 0, closing_note: '', counts: [] }, errors: {}, processing: false } as never}
                onSubmit={() => undefined}
                updateCount={() => undefined}
            />
        ));
    });

    it('restores focus for returns', async () => {
        await expectFocusAfterCancel((open, onOpenChange) => (
            <ReturnDialog
                open={open}
                onOpenChange={onOpenChange}
                invoiceNumber="HD-001"
                activeShift={null}
                saleItems={[]}
                form={{ data: { type: 'refund', refund_method: 'cash', reason: '', items: [] }, errors: {}, processing: false } as never}
                onSubmit={() => undefined}
            />
        ));
    });
});
