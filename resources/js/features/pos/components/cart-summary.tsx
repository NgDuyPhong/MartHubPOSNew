import { FieldError, FormErrorSummary } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatMoney } from '@/lib/format';
import { normalizeVietnamese } from '@/lib/vietnamese-search';
import { Banknote, QrCode, UserRound } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { Customer } from '../model/types';
import type { CheckoutErrors } from '../model/validation';
import { PosMoneyInput } from './pos-money-input';

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
    errors,
    overrideNeeded,
    customers,
    onCashChange,
    onQrChange,
    onQrConfirm,
    onCustomerChange,
    onQuickCreateCustomer,
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
    errors: CheckoutErrors;
    overrideNeeded: boolean;
    customers: Customer[];
    onCashChange: (value: number) => void;
    onQrChange: (value: number) => void;
    onQrConfirm: (value: boolean) => void;
    onCustomerChange: (value: number | null) => void;
    onQuickCreateCustomer: () => void;
    onOwnerPinChange: (value: string) => void;
    onCheckout: () => void;
}) {
    const selectedCustomer = customers.find((customer) => customer.id === customerId);
    const [customerSearch, setCustomerSearch] = useState('');
    const [customerPickerOpen, setCustomerPickerOpen] = useState(false);
    const filteredCustomers = useMemo(() => {
        const needle = normalizeVietnamese(customerSearch);
        return customers
            .filter((customer) => !needle || normalizeVietnamese(`${customer.code} ${customer.name} ${customer.phone ?? ''}`).includes(needle))
            .slice(0, 30);
    }, [customerSearch, customers]);
    const hasValidationErrors = Object.keys(errors).length > 0;
    const cashDue = Math.max(0, total - qr);
    const cashSuggestions = useMemo(
        () =>
            [...new Set([cashDue, Math.ceil(cashDue / 10000) * 10000, Math.ceil(cashDue / 50000) * 50000])].filter(
                (amount) => amount > 0 && Number.isFinite(amount),
            ),
        [cashDue],
    );

    return (
        <div ref={checkoutRef} className="bg-muted border-t p-4">
            <div className="mb-3 grid grid-cols-3 gap-4 text-sm">
                <div>
                    <span className="text-muted-foreground">Tạm tính</span>
                    <div className="font-semibold">{formatMoney(subtotal)}đ</div>
                </div>
                <div>
                    <span className="text-muted-foreground">Giảm giá</span>
                    <div className="text-warning font-semibold">-{formatMoney(discount)}đ</div>
                </div>
                <div className="text-right">
                    <span className="text-muted-foreground">Phải thu</span>
                    <div className="text-primary text-2xl font-bold">{formatMoney(total)}đ</div>
                </div>
            </div>
            {hasValidationErrors && <FormErrorSummary errors={errors} />}
            {!expanded ? (
                <Button
                    className="bg-primary text-primary-foreground hover:bg-primary/90 h-12 w-full text-base"
                    disabled={total <= 0 || !activeShift}
                    onClick={onExpand}
                >
                    <Banknote className="mr-2 size-5" />
                    Thanh toán (F12)
                </Button>
            ) : (
                <div className="border-primary/30 bg-card space-y-3 rounded-lg border p-3 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-semibold">Thanh toán</h3>
                            <p className="text-muted-foreground text-xs">Cash, QR hoặc ghi nợ phần còn lại</p>
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
                                <Label htmlFor="pos-cash-amount" className="flex items-center gap-2">
                                    <Banknote className="size-4" />
                                    Tiền mặt khách đưa
                                </Label>
                                <PosMoneyInput
                                    id="pos-cash-amount"
                                    autoFocus
                                    min={0}
                                    value={cash}
                                    onValueChange={onCashChange}
                                    invalid={Boolean(errors.cash)}
                                    aria-describedby={errors.cash ? 'pos-cash-error' : undefined}
                                />
                                {cashSuggestions.length > 0 && (
                                    <div className="mt-2 flex flex-wrap gap-1" aria-label="Mệnh giá tiền mặt nhanh">
                                        {cashSuggestions.map((amount, index) => (
                                            <Button key={amount} type="button" size="sm" variant="outline" onClick={() => onCashChange(amount)}>
                                                {index === 0 ? 'Tiền đủ' : formatMoney(amount)}
                                            </Button>
                                        ))}
                                    </div>
                                )}
                                <FieldError id="pos-cash-error" message={errors.cash} />
                            </div>
                            <div>
                                <Label htmlFor="pos-qr-amount" className="flex items-center gap-2">
                                    <QrCode className="size-4" />
                                    Chuyển khoản / QR
                                </Label>
                                <PosMoneyInput
                                    id="pos-qr-amount"
                                    min={0}
                                    value={qr}
                                    onValueChange={onQrChange}
                                    invalid={Boolean(errors.qr)}
                                    aria-describedby={errors.qr ? 'pos-qr-error' : undefined}
                                />
                                <FieldError id="pos-qr-error" message={errors.qr} />
                            </div>
                            {qr > 0 && (
                                <div className="bg-warning-muted text-warning-foreground border-warning/40 flex items-start gap-2 rounded-md border p-3 text-sm">
                                    <Checkbox
                                        id="pos-qr-confirmed"
                                        checked={qrConfirmed}
                                        onCheckedChange={(checked) => onQrConfirm(checked === true)}
                                    />
                                    <Label htmlFor="pos-qr-confirmed">Tôi đã kiểm tra thủ công và thấy tiền vào tài khoản ngân hàng.</Label>
                                </div>
                            )}
                        </div>
                        <div className="bg-muted space-y-3 rounded-md p-3">
                            <div className="flex justify-between">
                                <span>Đã thanh toán</span>
                                <strong>{formatMoney(paid)}đ</strong>
                            </div>
                            <div className="text-destructive flex justify-between">
                                <span>Còn ghi nợ</span>
                                <strong>{formatMoney(debt)}đ</strong>
                            </div>
                            <div>
                                <div className="flex items-center justify-between gap-2">
                                    <Label htmlFor="pos-customer">
                                        <UserRound className="mr-1 inline size-4" />
                                        Khách hàng {debt > 0 && '*'}
                                    </Label>
                                    <Button type="button" size="sm" variant="ghost" onClick={onQuickCreateCustomer} disabled={!online}>
                                        Tạo nhanh
                                    </Button>
                                </div>
                                <div className="relative mt-1">
                                    <Input
                                        id="pos-customer"
                                        role="combobox"
                                        aria-expanded={customerPickerOpen}
                                        aria-controls="pos-customer-options"
                                        aria-invalid={errors.customerId ? true : undefined}
                                        aria-describedby={errors.customerId ? 'pos-customer-error' : undefined}
                                        value={
                                            selectedCustomer
                                                ? `${selectedCustomer.name}${selectedCustomer.phone ? ` · ${selectedCustomer.phone}` : ''}`
                                                : customerSearch
                                        }
                                        placeholder="Khách lẻ hoặc tìm khách hàng…"
                                        onFocus={() => setCustomerPickerOpen(true)}
                                        onChange={(event) => {
                                            setCustomerSearch(event.target.value);
                                            setCustomerPickerOpen(true);
                                            if (customerId !== null) onCustomerChange(null);
                                        }}
                                    />
                                    {customerPickerOpen && (
                                        <div
                                            id="pos-customer-options"
                                            role="listbox"
                                            className="bg-popover absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-md border p-1 shadow-lg"
                                        >
                                            <button
                                                type="button"
                                                className="hover:bg-accent w-full rounded px-2 py-2 text-left text-sm"
                                                onClick={() => {
                                                    onCustomerChange(null);
                                                    setCustomerSearch('');
                                                    setCustomerPickerOpen(false);
                                                }}
                                            >
                                                Khách lẻ
                                            </button>
                                            {filteredCustomers.map((customer) => (
                                                <button
                                                    type="button"
                                                    role="option"
                                                    aria-selected={customer.id === customerId}
                                                    key={customer.id}
                                                    className="hover:bg-accent w-full rounded px-2 py-2 text-left text-sm"
                                                    onClick={() => {
                                                        onCustomerChange(customer.id);
                                                        setCustomerSearch('');
                                                        setCustomerPickerOpen(false);
                                                    }}
                                                >
                                                    <span className="font-medium">{customer.name}</span>
                                                    <span className="text-muted-foreground ml-2 text-xs">
                                                        {customer.code}
                                                        {customer.phone ? ` · ${customer.phone}` : ''} · Nợ {formatMoney(customer.balance)}đ
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <FieldError id="pos-customer-error" message={errors.customerId} />
                            </div>
                            {overrideNeeded && (
                                <div>
                                    <Label htmlFor="pos-owner-pin">PIN chủ cửa hàng</Label>
                                    <Input
                                        id="pos-owner-pin"
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
                            <span className="text-muted-foreground">Tiền thừa:</span>{' '}
                            <strong className="text-success">{formatMoney(changeAmount)}đ</strong>
                            <span className="text-muted-foreground ml-3">Còn nợ:</span>{' '}
                            <strong className="text-destructive">{formatMoney(debt)}đ</strong>
                        </div>
                        <Button ref={confirmRef} onClick={onCheckout} disabled={processing || hasValidationErrors}>
                            {processing ? 'Đang lưu...' : online ? 'Xác nhận thanh toán · Enter' : 'Lưu hóa đơn offline'}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
