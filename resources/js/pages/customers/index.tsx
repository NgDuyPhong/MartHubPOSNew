import { CollectionState, FilterBar, PageHeader, PageShell, Pagination, SearchField } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { NativeSelect } from '@/components/ui/native-select';
import { CustomerFormDialog, CustomerTable, DebtPaymentDialog, type Customer, type CustomerWithBalance } from '@/features/customers';
import { useListQuery } from '@/hooks/use-list-query';
import AppLayout from '@/layouts/app-layout';
import type { Paginated } from '@/types/pagination';
import { Head, useForm } from '@inertiajs/react';
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
    const { query, update, reset, isLoading, error, retry } = useListQuery(route('customers.index'), { ...filters, page: 1 });
    const hasFilters = Boolean(query.search || query.status !== 'all' || query.debt !== 'all');
    const [open, setOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
    const [paymentCustomer, setPaymentCustomer] = useState<CustomerWithBalance | null>(null);
    const form = useForm({ name: '', phone: '', address: '', note: '' });
    const paymentForm = useForm<{
        shift_id: number;
        method: string;
        amount: number | '';
        reference: string;
        manually_confirmed: boolean;
        note: string;
    }>({
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
            <PageShell>
                <PageHeader
                    title="Khách hàng & công nợ"
                    description="Số điện thoại không bắt buộc; khách ghi nợ được nhận diện bằng mã nội bộ."
                    actions={
                        <Button onClick={() => setOpen(true)}>
                            <Plus />
                            Thêm khách hàng
                        </Button>
                    }
                />
                <FilterBar>
                    <SearchField value={query.search} onChange={(value) => update('search', value)} placeholder="Tìm mã, tên hoặc số điện thoại…" />
                    <NativeSelect
                        value={query.status}
                        onChange={(event) => update('status', event.target.value)}
                        aria-label="Lọc trạng thái"
                        className="md:w-44 md:shrink-0"
                    >
                        <option value="all">Tất cả trạng thái</option>
                        <option value="active">Đang hoạt động</option>
                        <option value="inactive">Ngừng hoạt động</option>
                    </NativeSelect>
                    <NativeSelect
                        value={query.debt}
                        onChange={(event) => update('debt', event.target.value)}
                        aria-label="Lọc công nợ"
                        className="md:w-44 md:shrink-0"
                    >
                        <option value="all">Tất cả công nợ</option>
                        <option value="with_debt">Đang có nợ</option>
                        <option value="without_debt">Không có nợ</option>
                    </NativeSelect>
                </FilterBar>
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
                    <CollectionState
                        isEmpty={!customers.data.length}
                        hasFilters={hasFilters}
                        onReset={reset}
                        error={error}
                        onRetry={retry}
                        isLoading={isLoading}
                        label="khách hàng"
                    />
                    <Pagination paginator={customers} routeUrl={route('customers.index')} query={query} />
                </div>
            </PageShell>
            <CustomerFormDialog
                open={open}
                onOpenChange={(value) => {
                    setOpen(value);
                    if (!value) {
                        setEditingCustomer(null);
                        form.reset();
                    }
                }}
                form={form}
                onSubmit={submit}
                editing={Boolean(editingCustomer)}
            />
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
