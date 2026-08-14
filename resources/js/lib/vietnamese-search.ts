/**
 * Normalize Vietnamese text for accent-insensitive client-side search.
 * Barcode/SKU exact matching must use its own normalizer so leading zeroes
 * and meaningful punctuation are never changed.
 */
export function normalizeVietnamese(value: string): string {
    return value
        .toLocaleLowerCase('vi-VN')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .trim();
}

export function vietnameseIncludes(value: string, searchTerm: string): boolean {
    const normalizedValue = normalizeVietnamese(value);
    const normalizedSearchTerm = normalizeVietnamese(searchTerm);

    return normalizedSearchTerm.length > 0 && normalizedValue.includes(normalizedSearchTerm);
}

export function vietnameseEquals(value: string, searchTerm: string): boolean {
    const normalizedValue = normalizeVietnamese(value);
    const normalizedSearchTerm = normalizeVietnamese(searchTerm);

    return normalizedSearchTerm.length > 0 && normalizedValue === normalizedSearchTerm;
}
