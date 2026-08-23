import { FieldError, FormErrorSummary } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useFocusReturn } from '@/hooks/use-focus-return';
import type { InertiaFormProps } from '@inertiajs/react';

type CustomerFormData = { name: string; phone: string; address: string; note: string };

export function CustomerFormDialog({
    open,
    onOpenChange,
    form,
    onSubmit,
    editing,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    form: InertiaFormProps<CustomerFormData>;
    onSubmit: (event: React.FormEvent) => void;
    editing?: boolean;
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
                    <DialogTitle>{editing ? 'Sửa khách hàng' : 'Thêm khách hàng'}</DialogTitle>
                    <DialogDescription>Tên là bắt buộc để nhận diện công nợ; số điện thoại có thể để trống.</DialogDescription>
                </DialogHeader>
                <form onSubmit={onSubmit} className="space-y-3">
                    <FormErrorSummary errors={form.errors} />
                    <div>
                        <Label htmlFor="customer-name">Tên khách hàng *</Label>
                        <Input
                            id="customer-name"
                            value={form.data.name}
                            onChange={(event) => form.setData('name', event.target.value)}
                            aria-invalid={form.errors.name ? true : undefined}
                            aria-describedby={form.errors.name ? 'customer-name-error' : undefined}
                            required
                        />
                        <FieldError id="customer-name-error" message={form.errors.name} />
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
                        <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={form.processing}>
                            Hủy
                        </Button>
                        <Button type="submit" disabled={form.processing}>
                            {editing ? 'Cập nhật khách hàng' : 'Lưu khách hàng'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
