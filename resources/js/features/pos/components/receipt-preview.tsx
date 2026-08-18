import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatMoney } from '@/lib/format';
import { CheckCircle2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { SaleReceipt } from '../model/types';

function paymentLabel(method: string): string {
    return method === 'cash' ? 'Tiền mặt' : method === 'qr' ? 'QR / chuyển khoản' : method;
}

function isPendingReceipt(receipt: SaleReceipt): boolean {
    return receipt.status === 'pending_sync' || (receipt.source === 'offline_sync' && !receipt.id);
}

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
                <div data-receipt className="bg-background text-foreground print:bg-white print:text-black">
                    <DialogHeader>
                        <DialogTitle className="text-center">MART HUB MINI MART</DialogTitle>
                        <DialogDescription className="text-center">HÓA ĐƠN BÁN HÀNG · KHỔ 58MM</DialogDescription>
                    </DialogHeader>
                    {receipt && (
                        <div className="mt-3 space-y-2 text-xs">
                            <div className="border-y border-dashed py-2">
                                <div className="flex items-center justify-between gap-2">
                                    <span>Số HĐ: {receipt.invoice_number}</span>
                                    {isPendingReceipt(receipt) && <strong className="text-warning">CHỜ ĐỒNG BỘ</strong>}
                                </div>
                                {receipt.branch_name && <div>Chi nhánh: {receipt.branch_name}</div>}
                                {receipt.shift_code && <div>Ca: {receipt.shift_code}</div>}
                                {receipt.cashier_name && <div>Thu ngân: {receipt.cashier_name}</div>}
                                {receipt.customer_name && <div>Khách hàng: {receipt.customer_name}</div>}
                                <div>Thời gian: {new Date(receipt.sold_at).toLocaleString('vi-VN')}</div>
                            </div>
                            {receipt.items.map((item) => (
                                <div key={item.id} className="min-w-0">
                                    <div className="font-medium break-words">{item.product_name}</div>
                                    <div className="text-muted-foreground break-words">
                                        {[item.variant_name, item.product_sku].filter(Boolean).join(' · ')}
                                    </div>
                                    <div className="flex items-start justify-between gap-2">
                                        <span className="min-w-0 break-words">
                                            {Number(item.quantity)} {item.unit_name} × {formatMoney(item.unit_price)}đ
                                            {item.discount_amount ? ` · Giảm ${formatMoney(item.discount_amount)}đ` : ''}
                                        </span>
                                        <span className="shrink-0">{formatMoney(item.line_total)}đ</span>
                                    </div>
                                </div>
                            ))}
                            <div className="space-y-1 border-t border-dashed pt-2">
                                <div className="flex justify-between">
                                    <span>Tạm tính</span>
                                    <span>{formatMoney(receipt.subtotal)}đ</span>
                                </div>
                                {receipt.discount_amount > 0 && (
                                    <div className="flex justify-between">
                                        <span>Giảm giá</span>
                                        <span>-{formatMoney(receipt.discount_amount)}đ</span>
                                    </div>
                                )}
                                <div className="flex justify-between font-semibold">
                                    <span>Tổng tiền</span>
                                    <strong>{formatMoney(receipt.total)}đ</strong>
                                </div>
                                {receipt.payments?.map((payment, index) => (
                                    <div key={`${payment.method}-${index}`} className="flex justify-between">
                                        <span>{paymentLabel(payment.method)}</span>
                                        <span>{formatMoney(payment.amount)}đ</span>
                                    </div>
                                ))}
                                <div className="flex justify-between">
                                    <span>Đã thu</span>
                                    <span>{formatMoney(receipt.paid_amount)}đ</span>
                                </div>
                                {receipt.change_amount > 0 && (
                                    <div className="flex justify-between">
                                        <span>Tiền thừa</span>
                                        <span>{formatMoney(receipt.change_amount)}đ</span>
                                    </div>
                                )}
                                {receipt.debt_amount > 0 && (
                                    <div className="flex justify-between">
                                        <span>Còn nợ</span>
                                        <span>{formatMoney(receipt.debt_amount)}đ</span>
                                    </div>
                                )}
                            </div>
                            {receipt.note && <div className="border-t border-dashed pt-2 break-words">Ghi chú: {receipt.note}</div>}
                            <div className="pt-1 text-center">Cảm ơn quý khách!</div>
                        </div>
                    )}
                </div>
                <DialogFooter data-print-hidden>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Đóng
                    </Button>
                    <Button onClick={() => window.print()} disabled={!receipt}>
                        In hóa đơn
                    </Button>
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
            className="bg-success-muted text-success-foreground border-success/30 fixed right-4 bottom-4 z-50 flex w-[calc(100%-2rem)] max-w-md items-start gap-3 rounded-lg border px-4 py-3 text-sm shadow-lg"
            role="status"
            aria-live="polite"
        >
            <CheckCircle2 className="text-success mt-0.5 size-5 shrink-0" />
            <div className="min-w-0 flex-1">
                <div className="font-semibold">
                    {isPendingReceipt(receipt) ? 'Đã lưu hóa đơn offline' : `Đã lưu hóa đơn ${receipt.invoice_number}`}
                </div>
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
