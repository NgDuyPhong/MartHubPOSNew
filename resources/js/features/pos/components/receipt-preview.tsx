import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatMoney } from '@/lib/format';
import { CheckCircle2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { SaleReceipt } from '../model/types';

export function ReceiptPreview({
    receipt,
    open,
    onOpenChange,
}: {
    receipt: SaleReceipt | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-sm">
                <div data-receipt className="bg-white text-black">
                    <DialogHeader>
                        <DialogTitle className="text-center">MART HUB MINI MART</DialogTitle>
                        <DialogDescription className="text-center">HÓA ĐƠN BÁN HÀNG · Khổ 58mm</DialogDescription>
                    </DialogHeader>
                    {receipt && (
                        <div className="mt-3 space-y-2 text-xs">
                            <div className="border-y border-dashed py-2">
                                <div>Số HĐ: {receipt.invoice_number}</div>
                                <div>Thời gian: {new Date(receipt.sold_at).toLocaleString('vi-VN')}</div>
                            </div>
                            {receipt.items.map((item) => (
                                <div key={item.id}>
                                    <div className="font-medium">{item.product_name}</div>
                                    <div className="flex justify-between">
                                        <span>
                                            {Number(item.quantity)} {item.unit_name} × {formatMoney(item.unit_price)}
                                        </span>
                                        <span>{formatMoney(item.line_total)}đ</span>
                                    </div>
                                </div>
                            ))}
                            <div className="space-y-1 border-t border-dashed pt-2">
                                <div className="flex justify-between">
                                    <span>Tổng tiền</span>
                                    <strong>{formatMoney(receipt.total)}đ</strong>
                                </div>
                                <div className="flex justify-between">
                                    <span>Đã thu</span>
                                    <span>{formatMoney(receipt.paid_amount)}đ</span>
                                </div>
                                {receipt.debt_amount > 0 && (
                                    <div className="flex justify-between">
                                        <span>Còn nợ</span>
                                        <span>{formatMoney(receipt.debt_amount)}đ</span>
                                    </div>
                                )}
                                <div className="text-center">Cảm ơn quý khách!</div>
                            </div>
                        </div>
                    )}
                </div>
                <DialogFooter data-print-hidden>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Đóng
                    </Button>
                    <Button onClick={() => window.print()}>In hóa đơn</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export function SaleSuccessBar({ receipt, onPreview, durationMs = 5000 }: { receipt: SaleReceipt; onPreview: () => void; durationMs?: number }) {
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        setVisible(true);
        const timer = window.setTimeout(() => setVisible(false), durationMs);

        return () => window.clearTimeout(timer);
    }, [durationMs, receipt.invoice_number]);

    if (!visible) return null;

    return (
        <div
            className="fixed right-4 bottom-4 z-50 flex w-[calc(100%-2rem)] max-w-md items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 shadow-lg"
            role="status"
            aria-live="polite"
        >
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" />
            <div className="min-w-0 flex-1">
                <div className="font-semibold">Đã lưu hóa đơn {receipt.invoice_number}</div>
                <div>
                    {formatMoney(receipt.total)}đ · Đã thu {formatMoney(receipt.paid_amount)}đ
                    {receipt.debt_amount > 0 ? ` · Còn nợ ${formatMoney(receipt.debt_amount)}đ` : ''}
                </div>
            </div>
            <div className="flex shrink-0 gap-2">
                <Button size="sm" variant="outline" onClick={onPreview}>
                    Xem hóa đơn
                </Button>
                <Button size="sm" onClick={onPreview}>
                    In
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setVisible(false)}>
                    Đóng
                </Button>
            </div>
        </div>
    );
}
