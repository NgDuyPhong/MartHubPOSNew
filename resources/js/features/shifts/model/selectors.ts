import type { CashCount } from './types';

export function calculateCashCount(counts: CashCount[]): number {
    return counts.reduce((sum, row) => sum + row.denomination * Math.max(0, row.quantity), 0);
}

export function updateCashCount(counts: CashCount[], index: number, quantity: number): CashCount[] {
    return counts.map((row, rowIndex) => (rowIndex === index ? { ...row, quantity: Math.max(0, quantity) } : row));
}
