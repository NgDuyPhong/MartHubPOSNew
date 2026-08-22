import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { InertiaFormProps } from '@inertiajs/react';
import { Link } from '@inertiajs/react';

export function OpenShiftDialog({
    open,
    onOpenChange,
    registers,
    form,
    searchRef,
    required = false,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    registers: Array<{ id: number; name: string }>;
    form: InertiaFormProps<{ register_id: number; opening_cash: number }>;
    searchRef: React.RefObject<HTMLInputElement | null>;
    required?: boolean;
}) {
    const hasRegister = registers.length > 0;

    return (
        <Dialog
            open={open}
            onOpenChange={(nextOpen) => {
                if (required && !nextOpen) return;
                onOpenChange(nextOpen);
            }}
        >
            <DialogContent
                showClose={!required}
                onEscapeKeyDown={(event) => {
                    if (required) event.preventDefault();
                }}
                onPointerDownOutside={(event) => {
                    if (required) event.preventDefault();
                }}
            >
                <DialogHeader>
                    <DialogTitle>Mở ca bán hàng</DialogTitle>
                    <DialogDescription>Cần ghi nhận tiền đầu ca trước khi phát sinh hóa đơn.</DialogDescription>
                </DialogHeader>
                {required && (
                    <div className="bg-warning-muted text-warning-foreground border-warning/40 rounded-md border px-3 py-2 text-sm" role="status">
                        POS đang khóa bán vì chưa có ca mở. Bạn có thể mở ca ngay hoặc đi tới màn hình quản lý ca.
                        <Link href={route('shifts.index')} className="text-primary mt-1 block font-medium underline underline-offset-2">
                            Mở màn hình ca
                        </Link>
                    </div>
                )}
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
                        <Label htmlFor="pos-open-shift-register">Quầy</Label>
                        {hasRegister ? (
                            <select
                                id="pos-open-shift-register"
                                name="register_id"
                                value={form.data.register_id}
                                onChange={(event) => form.setData('register_id', Number(event.target.value))}
                                className="bg-background mt-1 h-10 w-full rounded-md border px-3"
                                required
                            >
                                {registers.map((register) => (
                                    <option key={register.id} value={register.id}>
                                        {register.name}
                                    </option>
                                ))}
                            </select>
                        ) : (
                            <div className="bg-muted text-muted-foreground mt-1 rounded-md border px-3 py-2 text-sm" role="alert">
                                Chưa có đúng một quầy hoạt động cho chi nhánh. Hãy nhờ quản lý kiểm tra cấu hình quầy trước khi mở ca.
                            </div>
                        )}
                    </div>
                    <div>
                        <Label htmlFor="pos-opening-cash">Tiền đầu ca</Label>
                        <Input
                            id="pos-opening-cash"
                            name="opening_cash"
                            type="number"
                            min="0"
                            value={form.data.opening_cash}
                            onChange={(event) => form.setData('opening_cash', Number(event.target.value))}
                            required
                        />
                    </div>
                    {Object.keys(form.errors).length > 0 && (
                        <div className="text-destructive border-destructive/30 bg-destructive/10 rounded-md border px-3 py-2 text-sm">
                            {Object.values(form.errors)[0]}
                        </div>
                    )}
                    <DialogFooter>
                        <Button type="submit" disabled={form.processing || !hasRegister || form.data.register_id <= 0}>
                            {form.processing ? 'Đang mở ca...' : 'Mở ca'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
