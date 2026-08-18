import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { firstValidationMessage } from '@/lib/http/errors';
import { useEffect, useState } from 'react';
import { createQuickCustomer } from '../api/customer-api';
import type { Customer } from '../model/types';

export function QuickCustomerDialog({
    open,
    online,
    onOpenChange,
    onCreated,
}: {
    open: boolean;
    online: boolean;
    onOpenChange: (open: boolean) => void;
    onCreated: (customer: Customer) => void;
}) {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!open) {
            setName('');
            setPhone('');
            setError(null);
            setProcessing(false);
        }
    }, [open]);

    const submit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!online) {
            setError('Cần có mạng để tạo khách hàng mới.');
            return;
        }

        setProcessing(true);
        setError(null);
        try {
            const customer = await createQuickCustomer({ name: name.trim(), phone: phone.trim() });
            onCreated(customer);
            onOpenChange(false);
        } catch (requestError) {
            setError(firstValidationMessage(requestError) ?? (requestError instanceof Error ? requestError.message : 'Không thể tạo khách hàng.'));
        } finally {
            setProcessing(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <DialogTitle>Tạo nhanh khách hàng</DialogTitle>
                    <DialogDescription>Khách hàng mới sẽ được chọn ngay cho hóa đơn hiện tại.</DialogDescription>
                </DialogHeader>
                <form className="space-y-4" onSubmit={submit}>
                    <div className="space-y-2">
                        <Label htmlFor="quick-customer-name">Tên khách hàng</Label>
                        <Input
                            id="quick-customer-name"
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                            placeholder="Nguyễn Văn A"
                            autoFocus
                            required
                            maxLength={255}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="quick-customer-phone">Số điện thoại</Label>
                        <Input
                            id="quick-customer-phone"
                            value={phone}
                            onChange={(event) => setPhone(event.target.value)}
                            placeholder="Không bắt buộc"
                            maxLength={30}
                            inputMode="tel"
                        />
                    </div>
                    {!online && (
                        <p className="bg-warning-muted text-warning-foreground border-warning/40 rounded-md border px-3 py-2 text-sm">
                            Đang offline: hãy chọn khách hàng đã có hoặc tạo lại khi có mạng.
                        </p>
                    )}
                    {error && (
                        <p className="text-destructive border-destructive/30 bg-destructive/10 rounded-md border px-3 py-2 text-sm" role="alert">
                            {error}
                        </p>
                    )}
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Hủy
                        </Button>
                        <Button type="submit" disabled={processing || !online || !name.trim()}>
                            {processing ? 'Đang tạo…' : 'Tạo và chọn'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
