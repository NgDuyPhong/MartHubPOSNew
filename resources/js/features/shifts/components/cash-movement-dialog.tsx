import { FieldError, FormErrorSummary, MoneyInput } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { useFocusReturn } from '@/hooks/use-focus-return';
import type { InertiaFormProps } from '@inertiajs/react';

type CashMovementData = { type: string; amount: number | ''; reason: string };

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
                    <DialogTitle>Thu / chi tiền mặt ngoài bán hàng</DialogTitle>
                    <DialogDescription>Ví dụ: bỏ thêm tiền lẻ vào két hoặc lấy tiền chi phí cửa hàng.</DialogDescription>
                </DialogHeader>
                <form onSubmit={onSubmit} className="space-y-3">
                    <div>
                        <Label htmlFor="movement-type">Loại</Label>
                        <NativeSelect
                            id="movement-type"
                            className="bg-background h-10 w-full rounded-md border px-3"
                            value={form.data.type}
                            onChange={(event) => form.setData('type', event.target.value)}
                        >
                            <option value="in">Thu thêm vào két</option>
                            <option value="out">Chi / lấy khỏi két</option>
                        </NativeSelect>
                    </div>
                    <div>
                        <Label htmlFor="movement-amount">Số tiền</Label>
                        <MoneyInput
                            id="movement-amount"
                            min={1}
                            value={form.data.amount}
                            onValueChange={(value) => form.setData('amount', value)}
                            invalid={Boolean(form.errors.amount)}
                            aria-describedby={form.errors.amount ? 'movement-amount-error' : undefined}
                        />
                        <FieldError id="movement-amount-error" message={form.errors.amount} />
                    </div>
                    <div>
                        <Label htmlFor="movement-reason">Lý do *</Label>
                        <Input
                            id="movement-reason"
                            value={form.data.reason}
                            onChange={(event) => form.setData('reason', event.target.value)}
                            aria-invalid={form.errors.reason ? true : undefined}
                            aria-describedby={form.errors.reason ? 'movement-reason-error' : undefined}
                            required
                        />
                        <FieldError id="movement-reason-error" message={form.errors.reason} />
                    </div>
                    <FormErrorSummary errors={form.errors} />
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={form.processing}>
                            Hủy
                        </Button>
                        <Button type="submit" disabled={form.processing}>
                            Ghi nhận
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
