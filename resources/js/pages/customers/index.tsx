import { Button } from '@/components/ui/button';
import { CustomerFormDialog, CustomerTable, DebtPaymentDialog, type Customer, type CustomerWithBalance } from '@/features/customers';
import AppLayout from '@/layouts/app-layout';
import { Head, useForm } from '@inertiajs/react';
import { Plus } from 'lucide-react';
import type { FormEvent } from 'react';
import { useState } from 'react';

export default function CustomersPage({
    customers,
    activeShift,
}: {
    customers: { data: Customer[] };
    activeShift: { id: number; code: string } | null;
}) {
    const [open, setOpen] = useState(false);
    const [paymentCustomer, setPaymentCustomer] = useState<CustomerWithBalance | null>(null);
    const form = useForm({ name: '', phone: '', address: '', note: '' });
    const paymentForm = useForm<{ shift_id: number; method: string; amount: number; reference: string; manually_confirmed: boolean; note: string }>({
        shift_id: activeShift?.id ?? 0,
        method: 'cash',
        amount: 0,
        reference: '',
        manually_confirmed: false,
        note: '',
    });
    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.post(route('customers.store'), {
            onSuccess: () => {
                setOpen(false);
                form.reset();
            },
        });
    };
    const submitPayment = (event: FormEvent) => {
        event.preventDefault();
        if (!paymentCustomer) return;
        paymentForm.post(route('customers.payments.store', paymentCustomer.id), {
            onSuccess: () => {
                setPaymentCustomer(null);
                paymentForm.reset();
            },
        });
    };

    return (
        <AppLayout breadcrumbs={[{ title: 'Khách hàng & công nợ', href: route('customers.index') }]}>
            <Head title="Khách hàng & công nợ" />
            <div className="space-y-4 p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold">Khách hàng & công nợ</h1>
                        <p className="text-muted-foreground text-sm">Số điện thoại không bắt buộc; khách ghi nợ được nhận diện bằng mã nội bộ.</p>
                    </div>
                    <Button onClick={() => setOpen(true)}>
                        <Plus className="mr-2 size-4" />
                        Thêm khách hàng
                    </Button>
                </div>
                <CustomerTable
                    customers={customers.data}
                    activeShift={Boolean(activeShift)}
                    onReceiveDebt={(customer, balance) => {
                        setPaymentCustomer({ ...customer, balance });
                        paymentForm.setData('amount', balance);
                    }}
                />
            </div>
            <CustomerFormDialog open={open} onOpenChange={setOpen} form={form} onSubmit={submit} />
            <DebtPaymentDialog
                open={Boolean(paymentCustomer)}
                onOpenChange={(value) => !value && setPaymentCustomer(null)}
                customer={paymentCustomer}
                activeShift={activeShift}
                form={paymentForm}
                onSubmit={submitPayment}
            />
        </AppLayout>
    );
}
