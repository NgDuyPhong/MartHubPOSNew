import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { InertiaFormProps } from '@inertiajs/react';

export function ReconcileShiftDialog({
    open,
    onOpenChange,
    form,
    onSubmit,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    form: InertiaFormProps<{ reconciliation_note: string }>;
    onSubmit: (event: React.FormEvent) => void;
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Xác nhận đối soát ca</DialogTitle>
                    <DialogDescription>
                        Không mở lại ca và không thay đổi tiền thực đếm. Ghi chú giúp lưu lại cách xử lý giao dịch đến muộn.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={onSubmit} className="flex flex-col gap-3">
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="reconciliation-note">Ghi chú</Label>
                        <Input
                            id="reconciliation-note"
                            value={form.data.reconciliation_note}
                            onChange={(event) => form.setData('reconciliation_note', event.target.value)}
                            placeholder="Ví dụ: đã kiểm tra giao dịch offline…"
                        />
                        {form.errors.reconciliation_note && <p className="text-destructive text-xs">{form.errors.reconciliation_note}</p>}
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Hủy
                        </Button>
                        <Button type="submit" disabled={form.processing}>
                            {form.processing ? 'Đang lưu…' : 'Xác nhận đối soát'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
