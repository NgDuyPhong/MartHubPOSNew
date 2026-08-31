import { FieldError, MoneyInput } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { useFocusReturn } from '@/hooks/use-focus-return';
import { formatMoney } from '@/lib/format';
import type { InertiaFormProps } from '@inertiajs/react';
import type { CustomerWithBalance } from '../model/types';

type PaymentFormData = { shift_id: number; method: string; amount: number | ''; reference: string; manually_confirmed: boolean; note: string };

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
    const { captureFocus, restoreFocus } = useFocusReturn(open);
    const handleOpenChange = (nextOpen: boolean) => {
        if (!nextOpen) restoreFocus();
        onOpenChange(nextOpen);
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent
                onOpenAutoFocus={() => captureFocus()}
                onCloseAutoFocus={(event) => {
                    event.preventDefault();
                    restoreFocus();
                }}
            >
                <DialogHeader>
                    <DialogTitle>Thu công nợ</DialogTitle>
                    <DialogDescription>
                        {customer?.name} đang nợ {formatMoney(customer?.balance ?? 0)}đ. Khoản thu sẽ vào ca {activeShift?.code}.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={onSubmit} className="space-y-3">
                    <div>
                        <Label htmlFor="payment-amount">Số tiền thu</Label>
                        <MoneyInput
                            id="payment-amount"
                            min={1}
                            max={customer?.balance}
                            value={form.data.amount}
                            onValueChange={(value) => form.setData('amount', value)}
                            invalid={Boolean(form.errors.amount)}
                            aria-describedby={form.errors.amount ? 'payment-amount-error' : undefined}
                        />
                        <FieldError id="payment-amount-error" message={form.errors.amount} />
                    </div>
                    <div>
                        <Label htmlFor="payment-method">Phương thức</Label>
                        <NativeSelect
                            id="payment-method"
                            className="bg-background h-10 w-full rounded-md border px-3"
                            value={form.data.method}
                            onChange={(event) => form.setData('method', event.target.value)}
                        >
                            <option value="cash">Tiền mặt</option>
                            <option value="qr">Chuyển khoản / QR</option>
                        </NativeSelect>
                    </div>
                    {form.data.method === 'qr' && (
                        <div className="border-warning/40 bg-warning-muted text-warning-muted-foreground flex items-start gap-2 rounded-md border p-3 text-sm">
                            <Checkbox
                                id="payment-qr-confirmed"
                                checked={form.data.manually_confirmed}
                                onCheckedChange={(checked) => form.setData('manually_confirmed', checked === true)}
                            />
                            <Label htmlFor="payment-qr-confirmed">Đã kiểm tra thủ công tiền vào tài khoản</Label>
                        </div>
                    )}
                    <div>
                        <Label htmlFor="payment-note">Ghi chú</Label>
                        <Input id="payment-note" value={form.data.note} onChange={(event) => form.setData('note', event.target.value)} />
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={form.processing}>
                            Hủy
                        </Button>
                        <Button type="submit" disabled={form.processing || !activeShift}>
                            Ghi nhận thu nợ
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
