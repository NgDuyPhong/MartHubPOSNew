import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { InertiaFormProps } from '@inertiajs/react';

export function OpenShiftDialog({
    open,
    onOpenChange,
    registers,
    form,
    searchRef,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    registers: Array<{ id: number; name: string }>;
    form: InertiaFormProps<{ register_id: number; opening_cash: number }>;
    searchRef: React.RefObject<HTMLInputElement | null>;
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Mở ca bán hàng</DialogTitle>
                    <DialogDescription>Cần ghi nhận tiền đầu ca trước khi phát sinh hóa đơn.</DialogDescription>
                </DialogHeader>
                <form
                    onSubmit={(event) => {
                        event.preventDefault();
                        form.post(route('shifts.store'), {
                            preserveScroll: true,
                            onSuccess: () => {
                                onOpenChange(false);
                                form.reset();
                                searchRef.current?.focus();
                            },
                        });
                    }}
                    className="space-y-4"
                >
                    <div>
                        <Label>Quầy</Label>
                        <select
                            name="register_id"
                            value={form.data.register_id}
                            onChange={(event) => form.setData('register_id', Number(event.target.value))}
                            className="mt-1 h-10 w-full rounded-md border bg-white px-3"
                            required
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
                            name="opening_cash"
                            type="number"
                            min="0"
                            value={form.data.opening_cash}
                            onChange={(event) => form.setData('opening_cash', Number(event.target.value))}
                            required
                        />
                    </div>
                    {Object.keys(form.errors).length > 0 && (
                        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                            {Object.values(form.errors)[0]}
                        </div>
                    )}
                    <DialogFooter>
                        <Button type="submit" disabled={form.processing}>
                            {form.processing ? 'Đang mở ca...' : 'Mở ca'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
