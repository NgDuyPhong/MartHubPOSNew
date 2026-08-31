import { FieldError, FormErrorSummary, MoneyInput } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { useFocusReturn } from '@/hooks/use-focus-return';
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
    form: InertiaFormProps<{ register_id: number; opening_cash: number | '' }>;
    searchRef: React.RefObject<HTMLInputElement | null>;
    required?: boolean;
}) {
    const hasRegister = registers.length > 0;
    const { captureFocus, restoreFocus } = useFocusReturn(open);
    const handleOpenChange = (nextOpen: boolean) => {
        if (!nextOpen) restoreFocus();
        onOpenChange(nextOpen);
    };

    return (
        <Dialog
            open={open}
            onOpenChange={(nextOpen) => {
                if (required && !nextOpen) return;
                handleOpenChange(nextOpen);
            }}
        >
            <DialogContent
                showClose={!required}
                onOpenAutoFocus={() => captureFocus()}
                onCloseAutoFocus={(event) => {
                    event.preventDefault();
                    restoreFocus();
                }}
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
                    <div
                        className="bg-warning-muted text-warning-muted-foreground border-warning/40 rounded-md border px-3 py-2 text-sm"
                        role="status"
                    >
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
                                handleOpenChange(false);
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
                            <NativeSelect
                                id="pos-open-shift-register"
                                name="register_id"
                                value={form.data.register_id}
                                onChange={(event) => form.setData('register_id', Number(event.target.value))}
                                className="bg-background mt-1 h-10 w-full rounded-md border px-3"
                                aria-invalid={form.errors.register_id ? true : undefined}
                                aria-describedby={form.errors.register_id ? 'pos-open-shift-register-error' : undefined}
                                required
                            >
                                {registers.map((register) => (
                                    <option key={register.id} value={register.id}>
                                        {register.name}
                                    </option>
                                ))}
                            </NativeSelect>
                        ) : (
                            <div className="bg-muted text-muted-foreground mt-1 rounded-md border px-3 py-2 text-sm" role="alert">
                                Chưa có đúng một quầy hoạt động cho chi nhánh. Hãy nhờ quản lý kiểm tra cấu hình quầy trước khi mở ca.
                            </div>
                        )}
                        <FieldError id="pos-open-shift-register-error" message={form.errors.register_id} />
                    </div>
                    <div>
                        <Label htmlFor="pos-opening-cash">Tiền đầu ca</Label>
                        <MoneyInput
                            id="pos-opening-cash"
                            name="opening_cash"
                            min={0}
                            value={form.data.opening_cash}
                            onValueChange={(value) => form.setData('opening_cash', value)}
                            invalid={Boolean(form.errors.opening_cash)}
                            aria-describedby={form.errors.opening_cash ? 'pos-opening-cash-error' : undefined}
                            required
                        />
                        <FieldError id="pos-opening-cash-error" message={form.errors.opening_cash} />
                    </div>
                    <FormErrorSummary errors={form.errors} />
                    <DialogFooter>
                        {!required && (
                            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={form.processing}>
                                Hủy
                            </Button>
                        )}
                        <Button type="submit" disabled={form.processing || !hasRegister || form.data.register_id <= 0}>
                            {form.processing ? 'Đang mở ca...' : 'Mở ca'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
