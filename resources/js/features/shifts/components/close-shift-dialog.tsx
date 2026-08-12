import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatMoney } from '@/lib/format';
import type { InertiaFormProps } from '@inertiajs/react';
import type { CashCount } from '../model/types';

type CloseShiftData = { actual_cash: number; closing_note: string; counts: CashCount[] };

export function CloseShiftDialog({
    open,
    onOpenChange,
    form,
    onSubmit,
    updateCount,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    form: InertiaFormProps<CloseShiftData>;
    onSubmit: (event: React.FormEvent) => void;
    updateCount: (index: number, quantity: number) => void;
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Kiểm đếm và chốt ca</DialogTitle>
                    <DialogDescription>Nhập số tờ theo mệnh giá; hệ thống tự cộng tiền thực tế và tính chênh lệch.</DialogDescription>
                </DialogHeader>
                <form onSubmit={onSubmit} className="space-y-4">
                    <div className="grid grid-cols-3 gap-2">
                        {form.data.counts.map((row, index) => (
                            <div key={row.denomination} className="bg-muted/30 rounded-md border p-2">
                                <Label htmlFor={`count-${row.denomination}`}>{formatMoney(row.denomination)}đ</Label>
                                <Input
                                    id={`count-${row.denomination}`}
                                    type="number"
                                    min="0"
                                    value={row.quantity}
                                    onChange={(event) => updateCount(index, Number(event.target.value))}
                                />
                            </div>
                        ))}
                    </div>
                    <div className="bg-primary/10 rounded-md p-3 text-right">
                        <span className="text-primary text-sm">Tiền thực đếm</span>
                        <div className="text-primary text-2xl font-semibold">{formatMoney(form.data.actual_cash)}đ</div>
                    </div>
                    <div>
                        <Label htmlFor="closing-note">Ghi chú chênh lệch</Label>
                        <Input
                            id="closing-note"
                            value={form.data.closing_note}
                            onChange={(event) => form.setData('closing_note', event.target.value)}
                        />
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={form.processing}>
                            Xác nhận chốt ca
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
