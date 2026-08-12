export type Shift = {
    id: number;
    code: string;
    status: string;
    opening_cash: number;
    expected_cash?: number;
    actual_cash?: number;
    difference_cash?: number;
    opened_at: string;
    register: { name: string };
};

export type CashCount = { denomination: number; quantity: number };

export const denominations = [500000, 200000, 100000, 50000, 20000, 10000, 5000, 2000, 1000] as const;
