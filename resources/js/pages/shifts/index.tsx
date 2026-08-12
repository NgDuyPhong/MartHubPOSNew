import { Button } from '@/components/ui/button';
import {
    calculateCashCount,
    CashMovementDialog,
    CloseShiftDialog,
    denominations,
    OpenShiftDialog,
    ShiftTable,
    updateCashCount,
    type Shift,
} from '@/features/shifts';
import AppLayout from '@/layouts/app-layout';
import { Head, useForm } from '@inertiajs/react';
import { PlayCircle } from 'lucide-react';
import type { FormEvent } from 'react';
import { useState } from 'react';

export default function ShiftsPage({ shifts, registers }: { shifts: { data: Shift[] }; registers: Array<{ id: number; name: string }> }) {
    const [openModal, setOpenModal] = useState(false);
    const [closing, setClosing] = useState<number | null>(null);
    const [cashShift, setCashShift] = useState<number | null>(null);
    const openForm = useForm({ register_id: registers[0]?.id ?? 0, opening_cash: 0 });
    const closeForm = useForm<{ actual_cash: number; closing_note: string; counts: Array<{ denomination: number; quantity: number }> }>({
        actual_cash: 0,
        closing_note: '',
        counts: denominations.map((denomination) => ({ denomination, quantity: 0 })),
    });
    const cashForm = useForm({ type: 'out', amount: 0, reason: '' });
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
    const updateCount = (index: number, quantity: number) => {
        const counts = updateCashCount(closeForm.data.counts, index, quantity);
        closeForm.setData((data) => ({ ...data, counts, actual_cash: calculateCashCount(counts) }));
    };

    return (
        <AppLayout breadcrumbs={[{ title: 'Ca / két', href: route('shifts.index') }]}>
            <Head title="Ca / két" />
            <div className="space-y-4 p-4">
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
                <ShiftTable shifts={shifts.data} onCashMovement={setCashShift} onClose={setClosing} />
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
        </AppLayout>
    );
}
