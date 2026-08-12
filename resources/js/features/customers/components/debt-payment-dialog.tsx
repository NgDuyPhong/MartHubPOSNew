import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatMoney } from '@/lib/format';
import type { InertiaFormProps } from '@inertiajs/react';
import type { CustomerWithBalance } from '../model/types';

type PaymentFormData = { shift_id: number; method: string; amount: number; reference: string; manually_confirmed: boolean; note: string };

export function DebtPaymentDialog({
    open,
    onOpenChange,
    customer,
    activeShift,
    form,
    onSubmit,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    customer: CustomerWithBalance | null;
    activeShift: { id: number; code: string } | null;
    form: InertiaFormProps<PaymentFormData>;
    onSubmit: (event: React.FormEvent) => void;
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Thu công nợ</DialogTitle>
                    <DialogDescription>
                        {customer?.name} đang nợ {formatMoney(customer?.balance ?? 0)}đ. Khoản thu sẽ vào ca {activeShift?.code}.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={onSubmit} className="space-y-3">
                    <div>
                        <Label htmlFor="payment-amount">Số tiền thu</Label>
                        <Input
                            id="payment-amount"
                            type="number"
                            min="1"
                            max={customer?.balance}
                            value={form.data.amount}
                            onChange={(event) => form.setData('amount', Number(event.target.value))}
                        />
                    </div>
                    <div>
                        <Label htmlFor="payment-method">Phương thức</Label>
                        <select
                            id="payment-method"
                            className="bg-background h-10 w-full rounded-md border px-3"
                            value={form.data.method}
                            onChange={(event) => form.setData('method', event.target.value)}
                        >
                            <option value="cash">Tiền mặt</option>
                            <option value="qr">Chuyển khoản / QR</option>
                        </select>
                    </div>
                    {form.data.method === 'qr' && (
                        <label className="flex gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm">
                            <input
                                type="checkbox"
                                checked={form.data.manually_confirmed}
                                onChange={(event) => form.setData('manually_confirmed', event.target.checked)}
                            />
                            Đã kiểm tra thủ công tiền vào tài khoản
                        </label>
                    )}
                    <div>
                        <Label htmlFor="payment-note">Ghi chú</Label>
                        <Input id="payment-note" value={form.data.note} onChange={(event) => form.setData('note', event.target.value)} />
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={form.processing || !activeShift}>
                            Ghi nhận thu nợ
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
