import { FieldError, FormErrorSummary, MoneyInput } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { useFocusReturn } from '@/hooks/use-focus-return';
import type { InertiaFormProps } from '@inertiajs/react';

type OpenShiftData = { register_id: number; opening_cash: number | '' };

export function OpenShiftDialog({
    open,
    onOpenChange,
    form,
    registers,
    onSubmit,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    form: InertiaFormProps<OpenShiftData>;
    registers: Array<{ id: number; name: string }>;
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
                    <DialogTitle>Mở ca</DialogTitle>
                    <DialogDescription>Nhập tiền mặt thực tế có trong két ở đầu ca.</DialogDescription>
                </DialogHeader>
                <form onSubmit={onSubmit} className="space-y-4">
                    <div>
                        <Label htmlFor="shift-register">Quầy</Label>
                        <NativeSelect
                            id="shift-register"
                            className="bg-background h-10 w-full rounded-md border px-3"
                            value={form.data.register_id}
                            onChange={(event) => form.setData('register_id', Number(event.target.value))}
                            aria-invalid={form.errors.register_id ? true : undefined}
                            aria-describedby={form.errors.register_id ? 'shift-register-error' : undefined}
                        >
                            {registers.map((register) => (
                                <option key={register.id} value={register.id}>
                                    {register.name}
                                </option>
                            ))}
                        </NativeSelect>
                        <FieldError id="shift-register-error" message={form.errors.register_id} />
                    </div>
                    <div>
                        <Label htmlFor="opening-cash">Tiền đầu ca</Label>
                        <MoneyInput
                            id="opening-cash"
                            min={0}
                            value={form.data.opening_cash}
                            onValueChange={(value) => form.setData('opening_cash', value)}
                            invalid={Boolean(form.errors.opening_cash)}
                            aria-describedby={form.errors.opening_cash ? 'opening-cash-error' : undefined}
                        />
                        <FieldError id="opening-cash-error" message={form.errors.opening_cash} />
                    </div>
                    <FormErrorSummary errors={form.errors} />
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={form.processing}>
                            Hủy
                        </Button>
                        <Button type="submit" disabled={form.processing}>
                            Mở ca
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
