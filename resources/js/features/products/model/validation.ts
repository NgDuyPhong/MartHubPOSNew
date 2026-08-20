import type { UnitRow } from './types';

export function normalizeUnitRows(rows: UnitRow[]): UnitRow[] {
    return rows.map((row) => ({
        ...row,
        conversion_to_base: row.is_base ? 1 : Math.max(0.000001, Number(row.conversion_to_base)),
        sale_price: Math.max(0, Number(row.sale_price)),
    }));
}

export function hasValidBaseUnit(rows: UnitRow[]): boolean {
    return rows.filter((row) => row.is_base).length === 1 && rows.some((row) => row.is_base && row.conversion_to_base === 1);
}

export function generateProductSku(): string {
    const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();

    return `SP-${suffix}`;
}
