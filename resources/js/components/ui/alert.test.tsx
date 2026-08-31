import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Alert, AlertDescription } from './alert';

describe('Alert', () => {
    it.each([
        ['info', 'text-info-muted-foreground'],
        ['success', 'text-success-muted-foreground'],
        ['warning', 'text-warning-muted-foreground'],
    ] as const)('uses the muted foreground contract for %s', (variant, foregroundClass) => {
        render(
            <Alert variant={variant}>
                <AlertDescription>Notice</AlertDescription>
            </Alert>,
        );

        expect(screen.getByRole('alert')).toHaveClass(foregroundClass);
    });
});
