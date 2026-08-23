import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PageShell } from './page-shell';

describe('PageShell', () => {
    it('provides a shared responsive page container', () => {
        render(
            <PageShell className="max-w-4xl">
                <h1>Products</h1>
            </PageShell>,
        );

        const shell = screen.getByRole('heading', { name: 'Products' }).parentElement;

        expect(shell).toHaveClass('flex', 'min-w-0', 'flex-1', 'p-4', 'md:p-5', 'lg:p-6', 'max-w-4xl');
    });
});
