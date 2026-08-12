import type { Customer } from './types';

export function customerBalance(customer: Customer): number {
    return Number(customer.debit_total ?? 0) - Number(customer.credit_total ?? 0);
}

export function canReceiveDebt(customer: Customer): boolean {
    return customerBalance(customer) > 0;
}
