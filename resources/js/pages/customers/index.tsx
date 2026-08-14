import { Button } from '@/components/ui/button';
import { CollectionState, Pagination, SearchField } from '@/components/shared';
import { useListQuery } from '@/hooks/use-list-query';
import { CustomerFormDialog, CustomerTable, DebtPaymentDialog, type Customer, type CustomerWithBalance } from '@/features/customers';
import AppLayout from '@/layouts/app-layout';
import { Head, useForm } from '@inertiajs/react';
import type { Paginated } from '@/types/pagination';
import { Plus } from 'lucide-react';
import type { FormEvent } from 'react';
import { useState } from 'react';

export default function CustomersPage({
    customers,
    activeShift,
    filters,
}: {
    customers: Paginated<Customer>;
    activeShift: { id: number; code: string } | null;
    filters: { search: string; status: string; debt: string; per_page: number };
}) {
    const { query, update, reset } = useListQuery(route('customers.index'), { ...filters, page: 1 });
    const hasFilters = Boolean(query.search || query.status !== 'all' || query.debt !== 'all');
    const [open, setOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
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
        const options = {
            onSuccess: () => {
                setOpen(false);
                setEditingCustomer(null);
                form.reset();
            },
        };
        if (editingCustomer) form.put(route('customers.update', editingCustomer.id), options);
        else form.post(route('customers.store'), options);
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
            <div className="flex flex-col gap-4 p-4 md:p-5 lg:p-6">
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
                <div className="flex flex-col gap-3 rounded-lg border bg-card p-3 shadow-sm md:flex-row md:items-center">
                    <SearchField value={query.search} onChange={(value) => update('search', value)} placeholder="Tìm mã, tên hoặc số điện thoại…" />
                    <select className="bg-background h-10 rounded-md border px-3 text-sm" value={query.status} onChange={(event) => update('status', event.target.value)} aria-label="Lọc trạng thái"><option value="all">Tất cả trạng thái</option><option value="active">Đang hoạt động</option><option value="inactive">Ngừng hoạt động</option></select>
                    <select className="bg-background h-10 rounded-md border px-3 text-sm" value={query.debt} onChange={(event) => update('debt', event.target.value)} aria-label="Lọc công nợ"><option value="all">Tất cả công nợ</option><option value="with_debt">Đang có nợ</option><option value="without_debt">Không có nợ</option></select>
                </div>
                <div className="bg-card overflow-hidden rounded-lg border shadow-sm">
                    <CustomerTable
                        customers={customers.data}
                        activeShift={Boolean(activeShift)}
                        onReceiveDebt={(customer, balance) => {
                        setPaymentCustomer({ ...customer, balance });
                        paymentForm.setData('amount', balance);
                        }}
                        onEdit={(customer) => {
                            setEditingCustomer(customer);
                            form.setData({ name: customer.name, phone: customer.phone ?? '', address: customer.address ?? '', note: '' });
                            form.clearErrors();
                            setOpen(true);
                        }}
                    />
                    <CollectionState isEmpty={!customers.data.length} hasFilters={hasFilters} onReset={reset} label="khách hàng" />
                    <Pagination paginator={customers} routeUrl={route('customers.index')} query={query} />
                </div>
            </div>
            <CustomerFormDialog open={open} onOpenChange={(value) => { setOpen(value); if (!value) { setEditingCustomer(null); form.reset(); } }} form={form} onSubmit={submit} editing={Boolean(editingCustomer)} />
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
