import { firstValidationMessage } from '@/lib/http/errors';
import { useMemo, useState } from 'react';
import { queueSale } from '../api/offline-sale-repository';
import { createSale, type SalePayload } from '../api/pos-api';
import { calculateCartTotals, requiresOwnerOverride } from '../model/selectors';
import type { CartLine, Customer, SaleReceipt, Shift } from '../model/types';
import { validateCheckout } from '../model/validation';

type CheckoutOptions = {
    cart: CartLine[];
    activeShift: Shift | null;
    online: boolean;
    customers: Customer[];
    clearCart: () => void;
    refreshPending: () => Promise<void>;
    onMessage: (message: string | null) => void;
    onSuccess: (receipt: SaleReceipt) => void;
};

export function usePosCheckout(options: CheckoutOptions) {
    const [expanded, setExpanded] = useState(false);
    const [cash, setCash] = useState(0);
    const [qr, setQr] = useState(0);
    const [qrConfirmed, setQrConfirmed] = useState(false);
    const [customerId, setCustomerId] = useState<number | null>(null);
    const [ownerPin, setOwnerPin] = useState('');
    const [processing, setProcessing] = useState(false);
    const totals = useMemo(() => calculateCartTotals(options.cart, cash, qr), [options.cart, cash, qr]);
    const overrideNeeded = useMemo(() => requiresOwnerOverride(options.cart), [options.cart]);

    const checkout = async () => {
        const errors = validateCheckout({ ...totals, cart: options.cart, customerId, qr, qrConfirmed, online: options.online, overrideNeeded });
        const firstError = Object.values(errors)[0];

        if (!options.activeShift || firstError) {
            options.onMessage(firstError ?? 'Cần mở ca trước khi thanh toán.');
            return;
        }

        const payload: SalePayload = {
            idempotency_key: crypto.randomUUID(),
            shift_id: options.activeShift.id,
            customer_id: customerId,
            source: options.online ? 'online' : 'offline_sync',
            items: options.cart.map((line) => ({
                product_unit_id: line.productUnit.id,
                quantity: line.quantity,
                ...(line.unitPrice !== line.productUnit.sale_price ? { unit_price: line.unitPrice } : {}),
                ...(line.discount ? { discount_amount: line.discount } : {}),
            })),
            payments: [
                ...(cash > 0 ? [{ method: 'cash' as const, amount: cash }] : []),
                ...(qr > 0 ? [{ method: 'qr' as const, amount: qr, manually_confirmed: qrConfirmed }] : []),
            ],
            ...(ownerPin ? { owner_pin: ownerPin } : {}),
        };

        setProcessing(true);
        options.onMessage(null);
        try {
            const receipt = await createSale(payload);
            options.onSuccess(receipt);
            reset();
        } catch (error) {
            if (!navigator.onLine && !overrideNeeded) {
                const offlinePayload = { ...payload, source: 'offline_sync' as const };
                delete offlinePayload.owner_pin;
                await queueSale(offlinePayload);
                await options.refreshPending();
                options.clearCart();
                setExpanded(false);
                options.onMessage('Đã lưu hóa đơn offline; hệ thống sẽ tự đồng bộ khi có mạng.');
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
        checkout,
    };
}
