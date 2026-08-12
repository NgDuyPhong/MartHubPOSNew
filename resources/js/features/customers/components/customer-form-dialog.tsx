import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { InertiaFormProps } from '@inertiajs/react';

type CustomerFormData = { name: string; phone: string; address: string; note: string };

export function CustomerFormDialog({
    open,
    onOpenChange,
    form,
    onSubmit,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    form: InertiaFormProps<CustomerFormData>;
    onSubmit: (event: React.FormEvent) => void;
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Thêm khách hàng</DialogTitle>
                    <DialogDescription>Tên là bắt buộc để nhận diện công nợ; số điện thoại có thể để trống.</DialogDescription>
                </DialogHeader>
                <form onSubmit={onSubmit} className="space-y-3">
                    <div>
                        <Label htmlFor="customer-name">Tên khách hàng *</Label>
                        <Input id="customer-name" value={form.data.name} onChange={(event) => form.setData('name', event.target.value)} required />
                        {form.errors.name && <p className="text-destructive text-xs">{form.errors.name}</p>}
                    </div>
                    <div>
                        <Label htmlFor="customer-phone">Số điện thoại</Label>
                        <Input id="customer-phone" value={form.data.phone} onChange={(event) => form.setData('phone', event.target.value)} />
                    </div>
                    <div>
                        <Label htmlFor="customer-address">Địa chỉ</Label>
                        <Input id="customer-address" value={form.data.address} onChange={(event) => form.setData('address', event.target.value)} />
                    </div>
                    <div>
                        <Label htmlFor="customer-note">Ghi chú</Label>
                        <Input id="customer-note" value={form.data.note} onChange={(event) => form.setData('note', event.target.value)} />
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={form.processing}>
                            Lưu khách hàng
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
