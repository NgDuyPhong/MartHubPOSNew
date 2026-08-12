import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { InertiaFormProps } from '@inertiajs/react';

type CashMovementData = { type: string; amount: number; reason: string };

export function CashMovementDialog({
    open,
    onOpenChange,
    form,
    onSubmit,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    form: InertiaFormProps<CashMovementData>;
    onSubmit: (event: React.FormEvent) => void;
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Thu / chi tiền mặt ngoài bán hàng</DialogTitle>
                    <DialogDescription>Ví dụ: bỏ thêm tiền lẻ vào két hoặc lấy tiền chi phí cửa hàng.</DialogDescription>
                </DialogHeader>
                <form onSubmit={onSubmit} className="space-y-3">
                    <div>
                        <Label htmlFor="movement-type">Loại</Label>
                        <select
                            id="movement-type"
                            className="bg-background h-10 w-full rounded-md border px-3"
                            value={form.data.type}
                            onChange={(event) => form.setData('type', event.target.value)}
                        >
                            <option value="in">Thu thêm vào két</option>
                            <option value="out">Chi / lấy khỏi két</option>
                        </select>
                    </div>
                    <div>
                        <Label htmlFor="movement-amount">Số tiền</Label>
                        <Input
                            id="movement-amount"
                            type="number"
                            min="1"
                            value={form.data.amount}
                            onChange={(event) => form.setData('amount', Number(event.target.value))}
                        />
                    </div>
                    <div>
                        <Label htmlFor="movement-reason">Lý do *</Label>
                        <Input
                            id="movement-reason"
                            value={form.data.reason}
                            onChange={(event) => form.setData('reason', event.target.value)}
                            required
                        />
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={form.processing}>
                            Ghi nhận
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
