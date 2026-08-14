import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatMoney } from '@/lib/format';
import { normalizeVietnamese } from '@/lib/vietnamese-search';
import { Banknote, QrCode, UserRound } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { Customer } from '../model/types';

export function CartSummary({
    checkoutRef,
    confirmRef,
    expanded,
    onExpand,
    onCollapse,
    subtotal,
    discount,
    total,
    paid,
    debt,
    changeAmount,
    cash,
    qr,
    qrConfirmed,
    customerId,
    ownerPin,
    online,
    processing,
    overrideNeeded,
    customers,
    onCashChange,
    onQrChange,
    onQrConfirm,
    onCustomerChange,
    onOwnerPinChange,
    onCheckout,
    searchRef,
    activeShift,
}: {
    checkoutRef: React.RefObject<HTMLDivElement | null>;
    confirmRef: React.RefObject<HTMLButtonElement | null>;
    searchRef: React.RefObject<HTMLInputElement | null>;
    activeShift: boolean;
    expanded: boolean;
    onExpand: () => void;
    onCollapse: () => void;
    subtotal: number;
    discount: number;
    total: number;
    paid: number;
    debt: number;
    changeAmount: number;
    cash: number;
    qr: number;
    qrConfirmed: boolean;
    customerId: number | null;
    ownerPin: string;
    online: boolean;
    processing: boolean;
    overrideNeeded: boolean;
    customers: Customer[];
    onCashChange: (value: number) => void;
    onQrChange: (value: number) => void;
    onQrConfirm: (value: boolean) => void;
    onCustomerChange: (value: number | null) => void;
    onOwnerPinChange: (value: string) => void;
    onCheckout: () => void;
}) {
    const selectedCustomer = customers.find((customer) => customer.id === customerId);
    const [customerSearch, setCustomerSearch] = useState('');
    const [customerPickerOpen, setCustomerPickerOpen] = useState(false);
    const filteredCustomers = useMemo(() => {
        const needle = normalizeVietnamese(customerSearch);
        return customers.filter((customer) => !needle || normalizeVietnamese(`${customer.code} ${customer.name} ${customer.phone ?? ''}`).includes(needle)).slice(0, 30);
    }, [customerSearch, customers]);

    return (
        <div ref={checkoutRef} className="border-t bg-slate-50 p-4">
            <div className="mb-3 grid grid-cols-3 gap-4 text-sm">
                <div>
                    <span className="text-slate-500">Tạm tính</span>
                    <div className="font-semibold">{formatMoney(subtotal)}đ</div>
                </div>
                <div>
                    <span className="text-slate-500">Giảm giá</span>
                    <div className="font-semibold text-orange-600">-{formatMoney(discount)}đ</div>
                </div>
                <div className="text-right">
                    <span className="text-slate-500">Phải thu</span>
                    <div className="text-2xl font-bold text-blue-700">{formatMoney(total)}đ</div>
                </div>
            </div>
            {!expanded ? (
                <Button className="h-12 w-full bg-blue-600 text-base hover:bg-blue-700" disabled={total <= 0 || !activeShift} onClick={onExpand}>
                    <Banknote className="mr-2 size-5" />
                    Thanh toán (F12)
                </Button>
            ) : (
                <div className="space-y-3 rounded-lg border border-blue-200 bg-white p-3 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-semibold">Thanh toán</h3>
                            <p className="text-xs text-slate-500">Cash, QR hoặc ghi nợ phần còn lại</p>
                        </div>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                onCollapse();
                                searchRef.current?.focus();
                            }}
                        >
                            Thu gọn
                        </Button>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                        <div className="space-y-3">
                            <div>
                                <Label className="flex items-center gap-2">
                                    <Banknote className="size-4" />
                                    Tiền mặt khách đưa
                                </Label>
                                <Input autoFocus type="number" min="0" value={cash} onChange={(event) => onCashChange(Number(event.target.value))} />
                            </div>
                            <div>
                                <Label className="flex items-center gap-2">
                                    <QrCode className="size-4" />
                                    Chuyển khoản / QR
                                </Label>
                                <Input type="number" min="0" value={qr} onChange={(event) => onQrChange(Number(event.target.value))} />
                            </div>
                            {qr > 0 && (
                                <label className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm">
                                    <input
                                        type="checkbox"
                                        className="mt-1"
                                        checked={qrConfirmed}
                                        onChange={(event) => onQrConfirm(event.target.checked)}
                                    />
                                    Tôi đã kiểm tra thủ công và thấy tiền vào tài khoản ngân hàng.
                                </label>
                            )}
                        </div>
                        <div className="space-y-3 rounded-md bg-slate-50 p-3">
                            <div className="flex justify-between">
                                <span>Đã thanh toán</span>
                                <strong>{formatMoney(paid)}đ</strong>
                            </div>
                            <div className="flex justify-between text-red-600">
                                <span>Còn ghi nợ</span>
                                <strong>{formatMoney(debt)}đ</strong>
                            </div>
                            <div>
                                <Label>
                                    <UserRound className="mr-1 inline size-4" />
                                    Khách hàng {debt > 0 && '*'}
                                </Label>
                                <div className="relative mt-1">
                                    <Input
                                        role="combobox"
                                        aria-expanded={customerPickerOpen}
                                        aria-controls="pos-customer-options"
                                        value={selectedCustomer ? `${selectedCustomer.name}${selectedCustomer.phone ? ` · ${selectedCustomer.phone}` : ''}` : customerSearch}
                                        placeholder="Khách lẻ hoặc tìm khách hàng…"
                                        onFocus={() => setCustomerPickerOpen(true)}
                                        onChange={(event) => {
                                            setCustomerSearch(event.target.value);
                                            setCustomerPickerOpen(true);
                                            if (customerId !== null) onCustomerChange(null);
                                        }}
                                    />
                                    {customerPickerOpen && (
                                        <div id="pos-customer-options" role="listbox" className="bg-popover absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-md border p-1 shadow-lg">
                                            <button type="button" className="hover:bg-accent w-full rounded px-2 py-2 text-left text-sm" onClick={() => { onCustomerChange(null); setCustomerSearch(''); setCustomerPickerOpen(false); }}>Khách lẻ</button>
                                            {filteredCustomers.map((customer) => (
                                                <button type="button" role="option" aria-selected={customer.id === customerId} key={customer.id} className="hover:bg-accent w-full rounded px-2 py-2 text-left text-sm" onClick={() => { onCustomerChange(customer.id); setCustomerSearch(''); setCustomerPickerOpen(false); }}>
                                                    <span className="font-medium">{customer.name}</span>
                                                    <span className="text-muted-foreground ml-2 text-xs">{customer.code}{customer.phone ? ` · ${customer.phone}` : ''} · Nợ {formatMoney(customer.balance)}đ</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                            {overrideNeeded && (
                                <div>
                                    <Label>PIN chủ cửa hàng</Label>
                                    <Input
                                        type="password"
                                        inputMode="numeric"
                                        value={ownerPin}
                                        disabled={!online}
                                        onChange={(event) => onOwnerPinChange(event.target.value)}
                                        placeholder={online ? 'Bắt buộc do có sửa giá/giảm giá' : 'Chỉ duyệt khi online'}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
                        <div className="text-sm">
                            <span className="text-slate-500">Tiền thừa:</span>{' '}
                            <strong className="text-emerald-700">{formatMoney(changeAmount)}đ</strong>
                            <span className="ml-3 text-slate-500">Còn nợ:</span> <strong className="text-red-600">{formatMoney(debt)}đ</strong>
                        </div>
                        <Button ref={confirmRef} onClick={onCheckout} disabled={processing}>
                            {processing ? 'Đang lưu...' : online ? 'Xác nhận thanh toán · Enter' : 'Lưu hóa đơn offline'}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
