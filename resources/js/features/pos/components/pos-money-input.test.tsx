import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { PosMoneyInput } from './pos-money-input';

describe('PosMoneyInput', () => {
    it('does not write an empty draft to the numeric owner and restores it on blur', async () => {
        const user = userEvent.setup();
        const onValueChange = vi.fn();

        render(<PosMoneyInput aria-label="Tiền mặt" value={100000} onValueChange={onValueChange} />);

        const input = screen.getByRole('textbox', { name: 'Tiền mặt' });
        await user.clear(input);

        expect(input).toHaveValue('');
        expect(onValueChange).not.toHaveBeenCalled();

        await user.tab();

        expect(input).toHaveValue('100.000');
        expect(onValueChange).not.toHaveBeenCalled();
    });

    it('restores an empty draft when Enter is pressed', async () => {
        const user = userEvent.setup();
        const onValueChange = vi.fn();

        render(<PosMoneyInput aria-label="Tiền mặt" value={100000} onValueChange={onValueChange} />);

        const input = screen.getByRole('textbox', { name: 'Tiền mặt' });
        await user.clear(input);
        await user.keyboard('{Enter}');

        expect(input).toHaveValue('100.000');
        expect(onValueChange).not.toHaveBeenCalled();
    });
});
