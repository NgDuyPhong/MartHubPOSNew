import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { MoneyInput } from './money-input';

describe('MoneyInput', () => {
    it('formats VND while typing and normalizes leading zeroes', async () => {
        const user = userEvent.setup();
        const onValueChange = vi.fn();

        render(<MoneyInput aria-label="Giá bán" value={''} onValueChange={onValueChange} />);

        const input = screen.getByRole('textbox', { name: 'Giá bán' });
        await user.type(input, '010000');

        expect(input).toHaveValue('10.000');
        expect(onValueChange).toHaveBeenLastCalledWith(10000);
    });

    it('emits an empty value instead of coercing a cleared field to zero', async () => {
        const user = userEvent.setup();
        const onValueChange = vi.fn();

        render(<MoneyInput aria-label="Giá bán" value={100000} onValueChange={onValueChange} />);

        const input = screen.getByRole('textbox', { name: 'Giá bán' });
        await user.clear(input);

        expect(input).toHaveValue('');
        expect(onValueChange).toHaveBeenLastCalledWith('');
    });

    it('sanitizes pasted formatted text', async () => {
        const user = userEvent.setup();
        const onValueChange = vi.fn();

        render(<MoneyInput aria-label="Giá bán" value={''} onValueChange={onValueChange} />);

        const input = screen.getByRole('textbox', { name: 'Giá bán' });
        await user.click(input);
        await user.paste('1.000.000 đ');

        expect(input).toHaveValue('1.000.000');
        expect(onValueChange).toHaveBeenLastCalledWith(1000000);
    });

    it('marks out-of-range values invalid without clamping them', async () => {
        const onValueChange = vi.fn();
        render(<MoneyInput aria-label="Giá bán" value={150000} min={0} max={100000} onValueChange={onValueChange} />);

        expect(screen.getByRole('textbox', { name: 'Giá bán' })).toHaveAttribute('aria-invalid', 'true');
    });

    it('synchronizes the display when the external value or sync key changes', () => {
        const onValueChange = vi.fn();
        const { rerender } = render(<MoneyInput aria-label="Giá bán" value={100000} syncKey="first" onValueChange={onValueChange} />);

        rerender(<MoneyInput aria-label="Giá bán" value={2500000} syncKey="second" onValueChange={onValueChange} />);

        expect(screen.getByRole('textbox', { name: 'Giá bán' })).toHaveValue('2.500.000');
    });

    it('exposes required, disabled and validation accessibility state', () => {
        render(<MoneyInput aria-label="Giá bán" value={''} onValueChange={vi.fn()} required disabled invalid aria-describedby="price-error" />);

        const input = screen.getByRole('textbox', { name: 'Giá bán' });
        expect(input).toBeRequired();
        expect(input).toBeDisabled();
        expect(input).toHaveAttribute('aria-invalid', 'true');
        expect(input).toHaveAttribute('aria-describedby', 'price-error');
    });

    it('keeps the caret aligned with the edited digit after formatting', async () => {
        const user = userEvent.setup();
        render(<MoneyInput aria-label="Giá bán" value={100000} onValueChange={vi.fn()} />);

        const input = screen.getByRole('textbox') as HTMLInputElement;
        input.focus();
        input.setSelectionRange(1, 1);
        await user.keyboard('2');

        expect(input).toHaveValue('1.200.000');
        expect(input.selectionStart).toBe(3);
    });
});
