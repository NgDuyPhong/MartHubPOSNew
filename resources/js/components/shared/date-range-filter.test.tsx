import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { DateRangeFilter } from './date-range-filter';

describe('DateRangeFilter', () => {
    it('exposes visible labels and reports a reversed range', () => {
        const onFromChange = vi.fn();
        const onToChange = vi.fn();

        render(<DateRangeFilter from="2026-08-20" to="2026-08-01" onFromChange={onFromChange} onToChange={onToChange} />);

        expect(screen.getByRole('group', { name: 'Khoảng ngày' })).toBeInTheDocument();
        expect(screen.getByLabelText('Từ ngày')).toHaveAttribute('aria-invalid', 'true');
        expect(screen.getByLabelText('Đến ngày')).toHaveAttribute('aria-invalid', 'true');
        expect(screen.getByRole('alert')).toHaveTextContent('Ngày bắt đầu không được sau ngày kết thúc.');
    });

    it('emits a changed date through the controlled contract', async () => {
        const user = userEvent.setup();
        const onFromChange = vi.fn();
        const onToChange = vi.fn();

        render(<DateRangeFilter from="2026-08-20" to={null} onFromChange={onFromChange} onToChange={onToChange} />);
        await user.clear(screen.getByLabelText('Từ ngày'));

        expect(onFromChange).toHaveBeenCalledWith(null);
    });

    it('can clear the end date and keeps the responsive layout contract', async () => {
        const user = userEvent.setup();
        const onFromChange = vi.fn();
        const onToChange = vi.fn();

        render(<DateRangeFilter from="2026-08-20" to="2026-08-21" onFromChange={onFromChange} onToChange={onToChange} />);

        await user.clear(screen.getByLabelText('Đến ngày'));

        expect(onToChange).toHaveBeenCalledWith(null);
        const grid = screen.getByLabelText('Từ ngày').parentElement?.parentElement;
        expect(grid).toHaveClass('grid', 'sm:grid-cols-2');
    });
});
