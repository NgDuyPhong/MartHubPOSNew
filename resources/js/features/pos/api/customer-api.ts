import { requestJson } from '@/lib/http/client';
import type { Customer } from '../model/types';

export async function createQuickCustomer(data: { name: string; phone: string }): Promise<Customer> {
    const response = await requestJson<{ customer: Customer }>(route('customers.quick.store'), {
        method: 'POST',
        body: data,
    });

    return response.customer;
}
