import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { DateRangeFilter } from './date-range-filter';

function getTrigger() {
    return screen.getByRole('button', { name: /Chọn khoảng ngày/ });
}

describe('DateRangeFilter', () => {
    it('keeps a compact control, visible labels, and reports a reversed range', () => {
        render(<DateRangeFilter from="2026-08-20" to="2026-08-01" onFromChange={vi.fn()} onToChange={vi.fn()} />);

        expect(screen.getByRole('group', { name: 'Khoảng ngày' })).toBeInTheDocument();
        expect(getTrigger()).toHaveAttribute('aria-invalid', 'true');
        expect(getTrigger().parentElement).toHaveClass('h-10');
        expect(screen.getByText('Từ ngày')).toBeVisible();
        expect(screen.getByText('Đến ngày')).toBeVisible();
        expect(screen.getByRole('alert')).toHaveTextContent('Ngày bắt đầu không được sau ngày kết thúc.');
    });

    it('shows two consecutive months in one range picker', async () => {
        const user = userEvent.setup();

        render(<DateRangeFilter from="2026-08-20" to={null} onFromChange={vi.fn()} onToChange={vi.fn()} />);
        await user.click(getTrigger());

        expect(screen.getByRole('region', { name: 'tháng 8 năm 2026' })).toBeInTheDocument();
        expect(screen.getByRole('region', { name: 'tháng 9 năm 2026' })).toBeInTheDocument();
        expect(screen.getByText('Hôm nay')).toBeInTheDocument();
    });

    it('keeps manual changes in draft until Apply is pressed', async () => {
        const user = userEvent.setup();
        const onFromChange = vi.fn();
        const onToChange = vi.fn();

        render(<DateRangeFilter from="2026-08-20" to={null} onFromChange={onFromChange} onToChange={onToChange} />);
        await user.click(getTrigger());
        await user.click(screen.getByRole('gridcell', { name: /23 tháng 8, 2026/i }));

        expect(onFromChange).not.toHaveBeenCalled();
        expect(onToChange).not.toHaveBeenCalled();

        await user.click(screen.getByRole('button', { name: 'Áp dụng' }));

        expect(onFromChange).toHaveBeenCalledWith('2026-08-20');
        expect(onToChange).toHaveBeenCalledWith('2026-08-23');
        expect(getTrigger()).toHaveAttribute('aria-expanded', 'false');
    });

    it('starts a new range when the current range is complete', async () => {
        const user = userEvent.setup();
        const onFromChange = vi.fn();
        const onToChange = vi.fn();

        render(<DateRangeFilter from="2026-08-20" to="2026-08-21" onFromChange={onFromChange} onToChange={onToChange} />);
        await user.click(getTrigger());
        await user.click(screen.getByRole('gridcell', { name: /25 tháng 8, 2026/i }));
        await user.click(screen.getByRole('button', { name: 'Áp dụng' }));

        expect(onFromChange).toHaveBeenCalledWith('2026-08-25');
        expect(onToChange).toHaveBeenCalledWith(null);
    });

    it('does not commit draft changes when the popup is cancelled', async () => {
        const user = userEvent.setup();
        const onFromChange = vi.fn();
        const onToChange = vi.fn();

        render(<DateRangeFilter from="2026-08-20" to={null} onFromChange={onFromChange} onToChange={onToChange} />);
        await user.click(getTrigger());
        await user.click(screen.getByRole('gridcell', { name: /23 tháng 8, 2026/i }));
        await user.click(screen.getByRole('button', { name: 'Hủy' }));

        expect(onFromChange).not.toHaveBeenCalled();
        expect(onToChange).not.toHaveBeenCalled();
        expect(getTrigger()).toHaveAttribute('aria-expanded', 'false');
    });

    it('applies a quick preset immediately', async () => {
        const user = userEvent.setup();
        const onFromChange = vi.fn();
        const onToChange = vi.fn();

        render(<DateRangeFilter from={null} to={null} onFromChange={onFromChange} onToChange={onToChange} />);
        await user.click(getTrigger());
        await user.click(screen.getByRole('button', { name: 'Hôm nay' }));

        expect(onFromChange).toHaveBeenCalledTimes(1);
        expect(onToChange).toHaveBeenCalledTimes(1);
        expect(onFromChange.mock.calls[0][0]).toBe(onToChange.mock.calls[0][0]);
        expect(getTrigger()).toHaveAttribute('aria-expanded', 'false');
    });

    it('supports month and year navigation modes', async () => {
        const user = userEvent.setup();

        render(<DateRangeFilter from="2026-08-20" to={null} onFromChange={vi.fn()} onToChange={vi.fn()} />);
        await user.click(getTrigger());
        await user.click(screen.getByRole('button', { name: 'Chọn tháng' }));

        expect(screen.getByRole('grid', { name: 'Chọn tháng 2026' })).toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: 'Chọn năm' }));

        expect(screen.getByRole('grid', { name: 'Chọn năm' })).toBeInTheDocument();
    });

    it('moves the calendar focus with arrow keys', async () => {
        const user = userEvent.setup();

        render(<DateRangeFilter from="2026-08-20" to={null} onFromChange={vi.fn()} onToChange={vi.fn()} />);
        await user.click(getTrigger());

        const focusedDay = screen.getByRole('gridcell', { name: /20 tháng 8, 2026/i });
        focusedDay.focus();
        await user.keyboard('{ArrowRight}');

        await waitFor(() => expect(document.activeElement).toHaveAttribute('id', 'date-range-day-2026-08-21'));
    });

    it('clears one boundary without clearing the other', async () => {
        const user = userEvent.setup();
        const onFromChange = vi.fn();
        const onToChange = vi.fn();

        render(<DateRangeFilter from="2026-08-20" to="2026-08-21" onFromChange={onFromChange} onToChange={onToChange} />);
        await user.click(getTrigger());
        await user.click(screen.getByRole('button', { name: /Đến: 21\/08\/2026/ }));
        await user.click(screen.getByRole('button', { name: 'Xóa mốc' }));
        await user.click(screen.getByRole('button', { name: 'Áp dụng' }));

        expect(onFromChange).toHaveBeenCalledWith('2026-08-20');
        expect(onToChange).toHaveBeenCalledWith(null);
    });

    it('disables dates outside the allowed bounds', async () => {
        const user = userEvent.setup();

        render(<DateRangeFilter from="2026-08-20" to={null} min="2026-08-18" max="2026-09-02" onFromChange={vi.fn()} onToChange={vi.fn()} />);
        await user.click(getTrigger());

        expect(screen.getByRole('gridcell', { name: /^Thứ Hai, 17 tháng 8, 2026$/i })).toBeDisabled();
        expect(screen.getByRole('gridcell', { name: /^Thứ Tư, 2 tháng 9, 2026$/i })).toBeEnabled();
        expect(screen.getByRole('gridcell', { name: /^Thứ Năm, 3 tháng 9, 2026$/i })).toBeDisabled();
        expect(screen.getByRole('button', { name: 'Năm nay' })).toBeEnabled();
    });
});
