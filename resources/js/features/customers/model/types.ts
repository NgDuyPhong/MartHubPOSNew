export type Customer = { id: number; code: string; name: string; phone?: string; address?: string; debit_total?: number; credit_total?: number };

export type CustomerWithBalance = Customer & { balance: number };
