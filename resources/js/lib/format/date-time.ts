function isCalendarDate(value: string | number | Date): value is string {
    return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function formatDateTime(value: string | number | Date, timeZone = 'UTC'): string {
    return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short', timeZone }).format(new Date(value));
}

export function formatDate(value: string | number | Date, timeZone = 'UTC'): string {
    const displayTimeZone = isCalendarDate(value) ? 'UTC' : timeZone;

    return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeZone: displayTimeZone }).format(new Date(value));
}
