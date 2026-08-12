import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { InertiaFormProps } from '@inertiajs/react';

type OpenShiftData = { register_id: number; opening_cash: number };

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
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Mở ca</DialogTitle>
                    <DialogDescription>Nhập tiền mặt thực tế có trong két ở đầu ca.</DialogDescription>
                </DialogHeader>
                <form onSubmit={onSubmit} className="space-y-4">
                    <div>
                        <Label htmlFor="shift-register">Quầy</Label>
                        <select
                            id="shift-register"
                            className="bg-background h-10 w-full rounded-md border px-3"
                            value={form.data.register_id}
                            onChange={(event) => form.setData('register_id', Number(event.target.value))}
                        >
                            {registers.map((register) => (
                                <option key={register.id} value={register.id}>
                                    {register.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <Label htmlFor="opening-cash">Tiền đầu ca</Label>
                        <Input
                            id="opening-cash"
                            type="number"
                            min="0"
                            value={form.data.opening_cash}
                            onChange={(event) => form.setData('opening_cash', Number(event.target.value))}
                        />
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={form.processing}>
                            Mở ca
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
