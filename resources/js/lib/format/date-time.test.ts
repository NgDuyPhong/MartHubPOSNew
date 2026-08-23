import { describe, expect, it } from 'vitest';

import { formatDate } from './date-time';

describe('formatDate', () => {
    it('keeps calendar dates stable in negative timezones', () => {
        expect(formatDate('2026-08-20', 'America/New_York')).toBe('20/8/26');
    });

    it('converts timestamps using the requested timezone', () => {
        expect(formatDate('2026-08-20T00:30:00Z', 'America/New_York')).toBe('19/8/26');
    });
});
