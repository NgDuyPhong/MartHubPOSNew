import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { DateRangeFilter } from './date-range-filter';

describe('DateRangeFilter', () => {
    it('exposes visible labels and reports a reversed range', () => {
        render(<DateRangeFilter from="2026-08-20" to="2026-08-01" onFromChange={vi.fn()} onToChange={vi.fn()} />);

        expect(screen.getByRole('group', { name: 'Khoảng ngày' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Chọn khoảng ngày' })).toHaveAttribute('aria-invalid', 'true');
        expect(screen.getByText('Từ ngày')).toBeVisible();
        expect(screen.getByText('Đến ngày')).toBeVisible();
        expect(screen.getByRole('alert')).toHaveTextContent('Ngày bắt đầu không được sau ngày kết thúc.');
    });

    it('shows two consecutive months in one range picker', async () => {
        const user = userEvent.setup();

        render(<DateRangeFilter from="2026-08-20" to={null} onFromChange={vi.fn()} onToChange={vi.fn()} />);
        await user.click(screen.getByRole('button', { name: 'Chọn khoảng ngày' }));

        expect(screen.getByRole('region', { name: 'tháng 8 năm 2026' })).toBeInTheDocument();
        expect(screen.getByRole('region', { name: 'tháng 9 năm 2026' })).toBeInTheDocument();
    });

    it('starts a new range when the current range is complete', async () => {
        const user = userEvent.setup();
        const onFromChange = vi.fn();
        const onToChange = vi.fn();

        render(<DateRangeFilter from="2026-08-20" to="2026-08-21" onFromChange={onFromChange} onToChange={onToChange} />);
        await user.click(screen.getByRole('button', { name: 'Chọn khoảng ngày' }));
        await user.click(screen.getByRole('gridcell', { name: /25 tháng 8, 2026/i }));

        expect(onFromChange).toHaveBeenCalledWith('2026-08-25');
        expect(onToChange).toHaveBeenCalledWith(null);
    });

    it('completes the range and closes the calendar', async () => {
        const user = userEvent.setup();
        const onToChange = vi.fn();

        render(<DateRangeFilter from="2026-08-20" to={null} onFromChange={vi.fn()} onToChange={onToChange} />);
        const trigger = screen.getByRole('button', { name: 'Chọn khoảng ngày' });
        await user.click(trigger);
        await user.click(screen.getByRole('gridcell', { name: /23 tháng 8, 2026/i }));

        expect(onToChange).toHaveBeenCalledWith('2026-08-23');
        expect(trigger).toHaveAttribute('aria-expanded', 'false');
    });

    it('clears the complete range with one action', async () => {
        const user = userEvent.setup();
        const onFromChange = vi.fn();
        const onToChange = vi.fn();

        render(<DateRangeFilter from="2026-08-20" to="2026-08-21" onFromChange={onFromChange} onToChange={onToChange} />);
        await user.click(screen.getByRole('button', { name: 'Xóa khoảng ngày' }));

        expect(onFromChange).toHaveBeenCalledWith(null);
        expect(onToChange).toHaveBeenCalledWith(null);
    });

    it('disables dates outside the allowed bounds', async () => {
        const user = userEvent.setup();

        render(<DateRangeFilter from="2026-08-20" to={null} min="2026-08-18" max="2026-09-02" onFromChange={vi.fn()} onToChange={vi.fn()} />);
        await user.click(screen.getByRole('button', { name: 'Chọn khoảng ngày' }));

        expect(screen.getByRole('gridcell', { name: /^Thứ Hai, 17 tháng 8, 2026$/i })).toBeDisabled();
        expect(screen.getByRole('gridcell', { name: /^Thứ Tư, 2 tháng 9, 2026$/i })).toBeEnabled();
        expect(screen.getByRole('gridcell', { name: /^Thứ Năm, 3 tháng 9, 2026$/i })).toBeDisabled();
    });
});
