const moneyFormatter = new Intl.NumberFormat('vi-VN');

export function formatMoney(value: number | string | null | undefined): string {
    return moneyFormatter.format(Number(value ?? 0));
}
