import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { InertiaFormProps } from '@inertiajs/react';
import type { ReturnFormData, SaleItem } from '../model/types';
import { ReturnItemsTable } from './return-items-table';

export function ReturnDialog({
    open,
    onOpenChange,
    invoiceNumber,
    customer,
    activeShift,
    saleItems,
    form,
    onSubmit,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    invoiceNumber: string;
    customer?: { name: string; phone?: string };
    activeShift: { id: number; code: string } | null;
    saleItems: SaleItem[];
    form: InertiaFormProps<ReturnFormData>;
    onSubmit: (event: React.FormEvent) => void;
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Đổi / trả từ {invoiceNumber}</DialogTitle>
                    <DialogDescription>Chỉ nhập số lượng cần trả. Hàng còn bán được sẽ cộng lại tồn kho.</DialogDescription>
                </DialogHeader>
                <form onSubmit={onSubmit} className="space-y-4">
                    <ReturnItemsTable saleItems={saleItems} form={form} />
                    <div className="grid gap-3 md:grid-cols-3">
                        <div>
                            <Label htmlFor="return-type">Loại xử lý</Label>
                            <select
                                id="return-type"
                                className="bg-background h-10 w-full rounded-md border px-2"
                                value={form.data.type}
                                onChange={(event) => form.setData('type', event.target.value)}
                            >
                                <option value="refund">Trả hàng</option>
                                <option value="exchange">Đổi hàng</option>
                            </select>
                        </div>
                        <div>
                            <Label htmlFor="refund-method">Hoàn tiền / cấn nợ</Label>
                            <select
                                id="refund-method"
                                className="bg-background h-10 w-full rounded-md border px-2"
                                value={form.data.refund_method}
                                onChange={(event) => form.setData('refund_method', event.target.value)}
                            >
                                <option value="cash">Tiền mặt</option>
                                <option value="qr">QR</option>
                                {customer && <option value="debt">Cấn trừ công nợ</option>}
                            </select>
                        </div>
                        <div>
                            <Label htmlFor="return-reason">Lý do *</Label>
                            <Input
                                id="return-reason"
                                value={form.data.reason}
                                onChange={(event) => form.setData('reason', event.target.value)}
                                required
                            />
                        </div>
                    </div>
                    {!activeShift && <p className="text-destructive text-sm">Cần mở ca trước khi đổi trả.</p>}
                    <DialogFooter>
                        <Button type="submit" disabled={form.processing || !activeShift}>
                            Xác nhận đổi/trả
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
