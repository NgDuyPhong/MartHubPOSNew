import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { PRICE_REPRICE_REQUIRED_CODE, type PendingSale } from '../api/offline-sale-repository';
import { SyncCenter } from './sync-center';

const conflictRecord: PendingSale = {
    idempotency_key: 'sale-1',
    payload: {
        idempotency_key: 'sale-1',
        shift_id: 1,
        customer_id: null,
        source: 'offline_sync',
        items: [],
        payments: [],
    },
    status: 'conflict',
    attempts: 1,
    created_at: '2026-09-01T00:00:00.000Z',
    updated_at: '2026-09-01T00:00:00.000Z',
    last_attempt_at: null,
    last_error_code: PRICE_REPRICE_REQUIRED_CODE,
    last_error_message: null,
};

describe('SyncCenter', () => {
    it('uses the adaptive warning text token for conflict guidance', () => {
        render(
            <SyncCenter
                open
                onOpenChange={vi.fn()}
                online
                records={[conflictRecord]}
                onSync={vi.fn()}
                onRetry={vi.fn()}
                onReprice={vi.fn()}
                onExport={vi.fn()}
            />,
        );

        expect(screen.getByText('Giá master đã thay đổi. Cần cập nhật giá hiện tại online trước khi đồng bộ.')).toHaveClass('text-warning-text');
    });
});
