import { firstValidationMessage } from '@/lib/http/errors';
import { useEffect, useMemo, useState } from 'react';
import { queueSale } from '../api/offline-sale-repository';
import { createSale, type SalePayload } from '../api/pos-api';
import { calculateCartTotals, hasStalePriceOverride, requiresOwnerOverride } from '../model/selectors';
import type { CartLine, CheckoutDraftSnapshot, Customer, Product, SaleReceipt, Shift } from '../model/types';
import type { CheckoutErrors } from '../model/validation';
import { validateCheckout } from '../model/validation';

function buildOfflineReceipt(payload: SalePayload, cart: CartLine[], totals: ReturnType<typeof calculateCartTotals>, shift: Shift): SaleReceipt {
    return {
        invoice_number: `OFFLINE-${payload.idempotency_key.slice(0, 8).toUpperCase()}`,
        sold_at: payload.occurred_at ?? new Date().toISOString(),
        source: 'offline_sync',
        status: 'pending_sync',
        shift_code: shift.code,
        subtotal: totals.subtotal,
        discount_amount: totals.discount,
        total: totals.total,
        paid_amount: totals.paid,
        debt_amount: totals.debt,
        change_amount: totals.changeAmount,
        items: cart.map((line, index) => ({
            id: index + 1,
            product_name: line.product.name,
            variant_name: line.variant.name,
            product_sku: line.product.sku,
            quantity: String(line.quantity),
            unit_name: line.productUnit.unit.name,
            unit_code: line.productUnit.unit.code,
            unit_price: line.unitPrice,
            original_unit_price: line.productUnit.sale_price,
            discount_amount: line.discount,
            line_total: Math.round(line.unitPrice * line.quantity) - line.discount,
        })),
        payments: payload.payments.map((payment) => ({ method: payment.method, amount: payment.amount })),
    };
}

type CheckoutOptions = {
    cart: CartLine[];
    catalog: Product[];
    scopeKey: string;
    activeShift: Shift | null;
    online: boolean;
    customers: Customer[];
    clearCart: () => void;
    refreshPending: () => Promise<void>;
    onMessage: (message: string | null) => void;
    onSuccess: (receipt: SaleReceipt) => void;
    ensureFresh?: (customerId: number | null) => Promise<{ activeShift: Shift | null; catalog: Product[] } | undefined>;
    refreshAfterSale?: () => Promise<void>;
};

export function usePosCheckout(options: CheckoutOptions) {
    const [expanded, setExpanded] = useState(false);
    const [cash, setCash] = useState(0);
    const [qr, setQr] = useState(0);
    const [qrConfirmed, setQrConfirmed] = useState(false);
    const [customerId, setCustomerId] = useState<number | null>(null);
    const [ownerPin, setOwnerPin] = useState('');
    const [processing, setProcessing] = useState(false);
    const [errors, setErrors] = useState<CheckoutErrors>({});
    const totals = useMemo(() => calculateCartTotals(options.cart, cash, qr), [options.cart, cash, qr]);
    const overrideNeeded = useMemo(
        () => requiresOwnerOverride(options.cart) || hasStalePriceOverride(options.cart, options.catalog),
        [options.cart, options.catalog],
    );

    useEffect(() => {
        setErrors({});
    }, [cash, qr, customerId, qrConfirmed, options.cart]);

    const checkout = async () => {
        const validationErrors = validateCheckout({
            ...totals,
            cart: options.cart,
            cash,
            qr,
            total: totals.total,
            customerId,
            qrConfirmed,
            online: options.online,
            overrideNeeded,
        });
        setErrors(validationErrors);
        const firstError = Object.values(validationErrors)[0];

        if (firstError || (!options.online && !options.activeShift)) {
            options.onMessage(firstError ?? 'Cần mở ca trước khi thanh toán.');
            return;
        }

        setProcessing(true);
        options.onMessage(null);
        let activeShift = options.activeShift;
        const makePayload = (shift: Shift): SalePayload => ({
            idempotency_key: crypto.randomUUID(),
            shift_id: shift.id,
            customer_id: customerId,
            source: options.online ? 'online' : 'offline_sync',
            items: options.cart.map((line) => ({
                product_unit_id: line.productUnit.id,
                quantity: line.quantity,
                unit_price: line.unitPrice,
                ...(line.discount ? { discount_amount: line.discount } : {}),
            })),
            payments: [
                ...(cash > 0 ? [{ method: 'cash' as const, amount: cash }] : []),
                ...(qr > 0 ? [{ method: 'qr' as const, amount: qr, manually_confirmed: qrConfirmed }] : []),
            ],
            occurred_at: new Date().toISOString(),
            queued_at: new Date().toISOString(),
            ...(ownerPin ? { owner_pin: ownerPin } : {}),
        });
        let payload: SalePayload | null = options.activeShift ? makePayload(options.activeShift) : null;
        try {
            let freshCatalog = options.catalog;
            if (options.online) {
                const freshData = await options.ensureFresh?.(customerId);
                activeShift = freshData ? freshData.activeShift : activeShift;
                freshCatalog = freshData?.catalog ?? freshCatalog;
            }
            const freshOverrideNeeded = requiresOwnerOverride(options.cart) || hasStalePriceOverride(options.cart, freshCatalog);
            if (freshOverrideNeeded && !ownerPin) {
                options.onMessage('Giá hiện tại đã thay đổi hoặc dòng hàng có sửa giá. Hãy nhập PIN chủ cửa hàng rồi thử lại.');
                return;
            }
            if (!activeShift) {
                options.onMessage('Cần mở ca trước khi thanh toán.');
                return;
            }
            if (!payload || payload.shift_id !== activeShift.id) payload = makePayload(activeShift);
            const receipt = await createSale(payload);
            options.onSuccess(receipt);
            if (options.refreshAfterSale) void options.refreshAfterSale().catch(() => undefined);
            reset();
        } catch (error) {
            if (payload && (!navigator.onLine || error instanceof TypeError) && !overrideNeeded) {
                const offlineShift = activeShift ?? options.activeShift;
                if (!offlineShift) {
                    options.onMessage('Cần mở ca trước khi thanh toán.');
                    return;
                }
                const offlinePayload = { ...payload, source: 'offline_sync' as const };
                delete offlinePayload.owner_pin;
                try {
                    await queueSale(offlinePayload, options.scopeKey);
                    await options.refreshPending();
                    options.onSuccess(buildOfflineReceipt(offlinePayload, options.cart, totals, offlineShift));
                    reset();
                    options.onMessage('Đã lưu hóa đơn offline; hệ thống sẽ tự đồng bộ khi có mạng.');
                } catch {
                    options.onMessage('Không thể lưu hóa đơn vào bộ nhớ offline. Hãy giữ nguyên màn hình và thử lại.');
                }
            } else {
                options.onMessage(firstValidationMessage(error) ?? (error instanceof Error ? error.message : 'Không thể lưu hóa đơn.'));
            }
        } finally {
            setProcessing(false);
        }
    };

    const reset = () => {
        options.clearCart();
        setExpanded(false);
        setCash(0);
        setQr(0);
        setQrConfirmed(false);
        setOwnerPin('');
        setCustomerId(null);
        setErrors({});
    };

    const restoreDraft = (snapshot: CheckoutDraftSnapshot) => {
        setCash(snapshot.cash);
        setQr(snapshot.qr);
        setQrConfirmed(snapshot.qrConfirmed);
        setCustomerId(snapshot.customerId);
        setOwnerPin('');
        setExpanded(false);
        setErrors({});
    };

    return {
        ...totals,
        overrideNeeded,
        expanded,
        setExpanded,
        cash,
        setCash,
        qr,
        setQr,
        qrConfirmed,
        setQrConfirmed,
        customerId,
        setCustomerId,
        ownerPin,
        setOwnerPin,
        processing,
        errors,
        restoreDraft,
        checkout,
    };
}
