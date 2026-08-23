import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { OpenShiftDialog } from './open-shift-dialog';

function renderDialog(required = false) {
    vi.stubGlobal('route', (name: string) => `/${name}`);
    const onOpenChange = vi.fn();
    const form = {
        data: { register_id: 1, opening_cash: 0 },
        errors: {},
        processing: false,
        post: vi.fn(),
        reset: vi.fn(),
        setData: vi.fn(),
    } as never;

    render(
        <OpenShiftDialog
            open
            onOpenChange={onOpenChange}
            registers={[{ id: 1, name: 'Quầy 1' }]}
            form={form}
            searchRef={createRef<HTMLInputElement>()}
            required={required}
        />,
    );

    return { onOpenChange };
}

describe('POS OpenShiftDialog', () => {
    it('allows cancelling when opening a shift is optional', async () => {
        const user = userEvent.setup();
        const { onOpenChange } = renderDialog();

        await user.click(screen.getByRole('button', { name: 'Hủy' }));

        expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it('does not expose cancel when opening a shift is required', () => {
        renderDialog(true);

        expect(screen.queryByRole('button', { name: 'Hủy' })).not.toBeInTheDocument();
    });

    it('keeps the required dialog open when Escape is pressed', async () => {
        const user = userEvent.setup();
        const { onOpenChange } = renderDialog(true);

        await user.keyboard('{Escape}');

        expect(onOpenChange).not.toHaveBeenCalled();
    });

    it('returns focus to the external trigger after optional cancel', async () => {
        const user = userEvent.setup();
        vi.stubGlobal('route', (name: string) => `/${name}`);
        const form = {
            data: { register_id: 1, opening_cash: 0 },
            errors: {},
            processing: false,
            post: vi.fn(),
            reset: vi.fn(),
            setData: vi.fn(),
        } as never;

        function Harness() {
            const [open, setOpen] = useState(false);

            return (
                <>
                    <button type="button" onClick={() => setOpen(true)}>
                        Mở dialog
                    </button>
                    <OpenShiftDialog
                        open={open}
                        onOpenChange={setOpen}
                        registers={[{ id: 1, name: 'Quầy 1' }]}
                        form={form}
                        searchRef={createRef<HTMLInputElement>()}
                    />
                </>
            );
        }

        render(<Harness />);
        const trigger = screen.getByRole('button', { name: 'Mở dialog' });
        await user.click(trigger);
        await user.click(screen.getByRole('button', { name: 'Hủy' }));

        expect(trigger).toHaveFocus();
    });
});
