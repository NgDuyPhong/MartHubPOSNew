import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Badge } from './badge';

describe('Badge', () => {
    it.each([
        ['info', 'text-info-muted-foreground'],
        ['success', 'text-success-muted-foreground'],
        ['warning', 'text-warning-muted-foreground'],
    ] as const)('uses the muted foreground contract for %s', (variant, foregroundClass) => {
        render(<Badge variant={variant}>Status</Badge>);

        expect(screen.getByText('Status')).toHaveClass(foregroundClass);
    });
});
