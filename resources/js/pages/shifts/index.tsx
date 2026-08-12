import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { formatDateTime, formatMoney } from '@/lib/format';
import { Head, useForm } from '@inertiajs/react';
import { ArrowDownToLine, LockKeyhole, PlayCircle } from 'lucide-react';
import { FormEvent, useState } from 'react';

const denominations = [500000, 200000, 100000, 50000, 20000, 10000, 5000, 2000, 1000];
type Shift = {
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
        openForm.post('/shifts', { onSuccess: () => setOpenModal(false) });
    };
    const submitClose = (event: FormEvent) => {
        event.preventDefault();
        if (closing) closeForm.post(`/shifts/${closing}/close`, { onSuccess: () => setClosing(null) });
    };
    const submitCash = (event: FormEvent) => {
        event.preventDefault();
        if (cashShift)
            cashForm.post(`/shifts/${cashShift}/cash-movements`, {
                onSuccess: () => {
                    setCashShift(null);
                    cashForm.reset();
                },
            });
    };
    const updateCount = (index: number, quantity: number) => {
        const counts = closeForm.data.counts.map((row, rowIndex) => (rowIndex === index ? { ...row, quantity } : row));
        closeForm.setData((data) => ({ ...data, counts, actual_cash: counts.reduce((sum, row) => sum + row.denomination * row.quantity, 0) }));
    };

    return (
        <AppLayout breadcrumbs={[{ title: 'Ca / két', href: '/shifts' }]}>
            <Head title="Ca / két" />
            <div className="space-y-4 p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Quản lý ca & két</h1>
                        <p className="text-sm text-slate-500">
                            Ca dùng chung cho quầy; mọi thao tác vẫn ghi nhận nhân viên thực hiện.
                        </p>
                    </div>
                    <Button onClick={() => setOpenModal(true)}>
                        <PlayCircle className="mr-2 size-4" />
                        Mở ca
                    </Button>
                </div>
                <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-left text-xs text-slate-500 uppercase">
                            <tr>
                                <th className="px-4 py-3">Ca / quầy</th>
                                <th className="px-4 py-3">Mở lúc</th>
                                <th className="px-4 py-3 text-right">Đầu ca</th>
                                <th className="px-4 py-3 text-right">Theo hệ thống</th>
                                <th className="px-4 py-3 text-right">Thực đếm / lệch</th>
                                <th className="px-4 py-3">Trạng thái</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {shifts.data.map((shift) => (
                                <tr key={shift.id} className="border-t">
                                    <td className="px-4 py-3">
                                        <div className="font-semibold">{shift.code}</div>
                                        <div className="text-xs text-slate-500">{shift.register.name}</div>
                                    </td>
                                    <td className="px-4">{formatDateTime(shift.opened_at)}</td>
                                    <td className="px-4 text-right">{formatMoney(shift.opening_cash)}đ</td>
                                    <td className="px-4 text-right">
                                        {shift.expected_cash == null ? '—' : `${formatMoney(shift.expected_cash)}đ`}
                                    </td>
                                    <td className="px-4 text-right">
                                        {shift.actual_cash == null ? (
                                            '—'
                                        ) : (
                                            <>
                                                <div>{formatMoney(shift.actual_cash)}đ</div>
                                                <div className={Number(shift.difference_cash) === 0 ? 'text-emerald-600' : 'text-red-600'}>
                                                    {Number(shift.difference_cash) > 0 ? '+' : ''}
                                                    {formatMoney(shift.difference_cash ?? 0)}đ
                                                </div>
                                            </>
                                        )}
                                    </td>
                                    <td className="px-4">
                                        {shift.status === 'open' ? (
                                            <Badge className="bg-emerald-100 text-emerald-800">Đang mở</Badge>
                                        ) : (
                                            <Badge variant="outline">Đã đóng</Badge>
                                        )}
                                    </td>
                                    <td className="px-4">
                                        <div className="flex justify-end gap-1">
                                            {shift.status === 'open' && (
                                                <>
                                                    <Button size="sm" variant="outline" onClick={() => setCashShift(shift.id)}>
                                                        <ArrowDownToLine className="mr-1 size-3" />
                                                        Thu/chi
                                                    </Button>
                                                    <Button size="sm" variant="outline" onClick={() => setClosing(shift.id)}>
                                                        <LockKeyhole className="mr-1 size-3" />
                                                        Chốt ca
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            <Dialog open={openModal} onOpenChange={setOpenModal}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Mở ca</DialogTitle>
                        <DialogDescription>Nhập tiền mặt thực tế có trong két ở đầu ca.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={submitOpen} className="space-y-4">
                        <div>
                            <Label>Quầy</Label>
                            <select
                                className="h-10 w-full rounded-md border bg-white px-3"
                                value={openForm.data.register_id}
                                onChange={(e) => openForm.setData('register_id', Number(e.target.value))}
                            >
                                {registers.map((register) => (
                                    <option key={register.id} value={register.id}>
                                        {register.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <Label>Tiền đầu ca</Label>
                            <Input
                                type="number"
                                min="0"
                                value={openForm.data.opening_cash}
                                onChange={(e) => openForm.setData('opening_cash', Number(e.target.value))}
                            />
                        </div>
                        <DialogFooter>
                            <Button type="submit">Mở ca</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
            <Dialog open={!!cashShift} onOpenChange={(open) => !open && setCashShift(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Thu / chi tiền mặt ngoài bán hàng</DialogTitle>
                        <DialogDescription>Ví dụ: bỏ thêm tiền lẻ vào két hoặc lấy tiền chi phí cửa hàng.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={submitCash} className="space-y-3">
                        <div>
                            <Label>Loại</Label>
                            <select
                                className="h-10 w-full rounded-md border bg-white px-3"
                                value={cashForm.data.type}
                                onChange={(e) => cashForm.setData('type', e.target.value)}
                            >
                                <option value="in">Thu thêm vào két</option>
                                <option value="out">Chi / lấy khỏi két</option>
                            </select>
                        </div>
                        <div>
                            <Label>Số tiền</Label>
                            <Input
                                type="number"
                                min="1"
                                value={cashForm.data.amount}
                                onChange={(e) => cashForm.setData('amount', Number(e.target.value))}
                            />
                        </div>
                        <div>
                            <Label>Lý do *</Label>
                            <Input value={cashForm.data.reason} onChange={(e) => cashForm.setData('reason', e.target.value)} required />
                        </div>
                        <DialogFooter>
                            <Button type="submit">Ghi nhận</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
            <Dialog open={!!closing} onOpenChange={(open) => !open && setClosing(null)}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Kiểm đếm và chốt ca</DialogTitle>
                        <DialogDescription>
                            Nhập số tờ theo mệnh giá; hệ thống tự cộng tiền thực tế và tính chênh lệch.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={submitClose} className="space-y-4">
                        <div className="grid grid-cols-3 gap-2">
                            {closeForm.data.counts.map((row, index) => (
                                <div key={row.denomination} className="rounded-md border bg-slate-50 p-2">
                                    <Label>{formatMoney(row.denomination)}đ</Label>
                                    <Input type="number" min="0" value={row.quantity} onChange={(e) => updateCount(index, Number(e.target.value))} />
                                </div>
                            ))}
                        </div>
                        <div className="rounded-md bg-blue-50 p-3 text-right">
                            <span className="text-sm text-blue-700">Tiền thực đếm</span>
                            <div className="text-2xl font-bold text-blue-800">{formatMoney(closeForm.data.actual_cash)}đ</div>
                        </div>
                        <div>
                            <Label>Ghi chú chênh lệch</Label>
                            <Input value={closeForm.data.closing_note} onChange={(e) => closeForm.setData('closing_note', e.target.value)} />
                        </div>
                        <DialogFooter>
                            <Button type="submit">Xác nhận chốt ca</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
