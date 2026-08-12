const dateTimeFormatter = new Intl.DateTimeFormat('vi-VN');
const dateFormatter = new Intl.DateTimeFormat('vi-VN');

export function formatDateTime(value: string | number | Date): string {
    return dateTimeFormatter.format(new Date(value));
}

export function formatDate(value: string | number | Date): string {
    return dateFormatter.format(new Date(value));
}
