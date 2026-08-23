import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Button } from './button';

describe('Button', () => {
    it('exposes button semantics and handles activation', async () => {
        const user = userEvent.setup();
        const handleClick = vi.fn();

        render(<Button onClick={handleClick}>Lưu</Button>);

        const button = screen.getByRole('button', { name: 'Lưu' });
        await user.click(button);

        expect(button).toBeEnabled();
        expect(handleClick).toHaveBeenCalledOnce();
    });

    it('keeps link semantics when rendered with asChild', () => {
        render(
            <Button asChild>
                <a href="/products">Sản phẩm</a>
            </Button>,
        );

        expect(screen.getByRole('link', { name: 'Sản phẩm' })).toHaveAttribute('href', '/products');
    });
});
