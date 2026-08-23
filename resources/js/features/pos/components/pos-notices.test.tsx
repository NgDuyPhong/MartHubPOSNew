import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { PosNotices } from './pos-notices';

describe('PosNotices', () => {
    it('renders only the relevant operational notices', async () => {
        const onUndo = vi.fn();
        const onDismiss = vi.fn();

        render(
            <PosNotices
                message="Đã lưu hóa đơn offline"
                undoCartCount={1}
                hasStaleCartPrice
                unavailableCartLineCount={2}
                onUndo={onUndo}
                onDismiss={onDismiss}
            />,
        );

        expect(screen.getAllByRole('status').some((element) => element.textContent?.includes('Đã lưu hóa đơn offline'))).toBe(true);
        expect(screen.getByRole('alert')).toHaveTextContent('2 dòng hàng');

        const user = userEvent.setup();
        await user.click(screen.getByRole('button', { name: 'Hoàn tác' }));
        await user.click(screen.getByRole('button', { name: 'Đóng' }));

        expect(onUndo).toHaveBeenCalledOnce();
        expect(onDismiss).toHaveBeenCalledOnce();
    });

    it('renders nothing when there are no notices', () => {
        const { container } = render(
            <PosNotices
                message={null}
                undoCartCount={0}
                hasStaleCartPrice={false}
                unavailableCartLineCount={0}
                onUndo={() => undefined}
                onDismiss={() => undefined}
            />,
        );

        expect(container).toBeEmptyDOMElement();
    });
});
