const quantityFormatter = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 3 });

export function formatQuantity(value: number | string | null | undefined): string {
    return quantityFormatter.format(Number(value ?? 0));
}
