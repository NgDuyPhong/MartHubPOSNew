import { CollectionState, Pagination, SearchField } from '@/components/shared';
import { Button } from '@/components/ui/button';
import {
    calculateCashCount,
    CashMovementDialog,
    CloseShiftDialog,
    denominations,
    OpenShiftDialog,
    ReconcileShiftDialog,
    ShiftTable,
    updateCashCount,
    type Shift,
} from '@/features/shifts';
import { useListQuery } from '@/hooks/use-list-query';
import AppLayout from '@/layouts/app-layout';
import type { Paginated } from '@/types/pagination';
import { Head, useForm } from '@inertiajs/react';
import { PlayCircle } from 'lucide-react';
import type { FormEvent } from 'react';
import { useState } from 'react';

export default function ShiftsPage({
    shifts,
    registers,
    filters,
}: {
    shifts: Paginated<Shift>;
    registers: Array<{ id: number; name: string }>;
    filters: { search: string; status: string; from: string | null; to: string | null; per_page: number };
}) {
    const { query, update, reset } = useListQuery(route('shifts.index'), { ...filters, page: 1 });
    const [openModal, setOpenModal] = useState(false);
    const [closing, setClosing] = useState<number | null>(null);
    const [cashShift, setCashShift] = useState<number | null>(null);
    const [reconciling, setReconciling] = useState<number | null>(null);
    const openForm = useForm({ register_id: registers[0]?.id ?? 0, opening_cash: 0 });
    const closeForm = useForm<{ actual_cash: number; closing_note: string; counts: Array<{ denomination: number; quantity: number }> }>({
        actual_cash: 0,
        closing_note: '',
        counts: denominations.map((denomination) => ({ denomination, quantity: 0 })),
    });
    const cashForm = useForm({ type: 'out', amount: 0, reason: '' });
    const reconcileForm = useForm({ reconciliation_note: '' });
    const submitOpen = (event: FormEvent) => {
        event.preventDefault();
        openForm.post(route('shifts.store'), { onSuccess: () => setOpenModal(false) });
    };
    const submitClose = (event: FormEvent) => {
        event.preventDefault();
        if (closing) closeForm.post(route('shifts.close', closing), { onSuccess: () => setClosing(null) });
    };
    const submitCash = (event: FormEvent) => {
        event.preventDefault();
        if (cashShift)
            cashForm.post(route('shifts.cash-movements.store', cashShift), {
                onSuccess: () => {
                    setCashShift(null);
                    cashForm.reset();
                },
            });
    };
    const submitReconcile = (event: FormEvent) => {
        event.preventDefault();
        if (reconciling)
            reconcileForm.post(route('shifts.reconcile', reconciling), {
                onSuccess: () => {
                    setReconciling(null);
                    reconcileForm.reset();
                },
            });
    };
    const updateCount = (index: number, quantity: number) => {
        const counts = updateCashCount(closeForm.data.counts, index, quantity);
        closeForm.setData((data) => ({ ...data, counts, actual_cash: calculateCashCount(counts) }));
    };

    return (
        <AppLayout breadcrumbs={[{ title: 'Ca / két', href: route('shifts.index') }]}>
            <Head title="Ca / két" />
            <div className="flex flex-col gap-4 p-4 md:p-5 lg:p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold">Quản lý ca & két</h1>
                        <p className="text-muted-foreground text-sm">Ca dùng chung cho quầy; mọi thao tác vẫn ghi nhận nhân viên thực hiện.</p>
                    </div>
                    <Button onClick={() => setOpenModal(true)}>
                        <PlayCircle className="mr-2 size-4" />
                        Mở ca
                    </Button>
                </div>
                <div className="bg-card flex flex-col gap-3 rounded-lg border p-3 shadow-sm md:flex-row md:items-center">
                    <SearchField value={query.search} onChange={(value) => update('search', value)} placeholder="Tìm mã ca hoặc quầy…" />
                    <select
                        className="bg-background h-10 rounded-md border px-3 text-sm"
                        value={query.status}
                        onChange={(event) => update('status', event.target.value)}
                        aria-label="Lọc trạng thái ca"
                    >
                        <option value="all">Tất cả ca</option>
                        <option value="open">Đang mở</option>
                        <option value="closed">Đã đóng</option>
                    </select>
                </div>
                <div className="bg-card flex flex-wrap gap-2 rounded-lg border p-3 shadow-sm">
                    <input
                        type="date"
                        className="bg-background h-10 rounded-md border px-3 text-sm"
                        value={query.from ?? ''}
                        onChange={(event) => update('from', event.target.value || null)}
                        aria-label="Từ ngày"
                    />
                    <input
                        type="date"
                        className="bg-background h-10 rounded-md border px-3 text-sm"
                        value={query.to ?? ''}
                        onChange={(event) => update('to', event.target.value || null)}
                        aria-label="Đến ngày"
                    />
                </div>
                <div className="bg-card overflow-hidden rounded-lg border shadow-sm">
                    <ShiftTable shifts={shifts.data} onCashMovement={setCashShift} onClose={setClosing} onReconcile={setReconciling} />
                    <CollectionState
                        isEmpty={!shifts.data.length}
                        hasFilters={Boolean(query.search || query.status !== 'all' || query.from || query.to)}
                        onReset={reset}
                        label="ca"
                    />
                    <Pagination paginator={shifts} routeUrl={route('shifts.index')} query={query} />
                </div>
            </div>
            <OpenShiftDialog open={openModal} onOpenChange={setOpenModal} form={openForm} registers={registers} onSubmit={submitOpen} />
            <CashMovementDialog
                open={Boolean(cashShift)}
                onOpenChange={(open) => !open && setCashShift(null)}
                form={cashForm}
                onSubmit={submitCash}
            />
            <CloseShiftDialog
                open={Boolean(closing)}
                onOpenChange={(open) => !open && setClosing(null)}
                form={closeForm}
                onSubmit={submitClose}
                updateCount={updateCount}
            />
            <ReconcileShiftDialog
                open={Boolean(reconciling)}
                onOpenChange={(open) => !open && setReconciling(null)}
                form={reconcileForm}
                onSubmit={submitReconcile}
            />
        </AppLayout>
    );
}
