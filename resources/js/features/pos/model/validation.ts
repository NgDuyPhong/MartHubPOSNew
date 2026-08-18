import type { CartLine } from './types';

export type CheckoutDraft = {
    cart: CartLine[];
    cash: number;
    qr: number;
    total: number;
    debt: number;
    customerId: number | null;
    qrConfirmed: boolean;
    online: boolean;
    overrideNeeded: boolean;
};

export type CheckoutErrors = Partial<Record<'cart' | 'customerId' | 'qr' | 'cash' | 'discount' | 'quantity' | 'offline', string>>;

export function validateCheckout(draft: CheckoutDraft): CheckoutErrors {
    const errors: CheckoutErrors = {};

    if (!draft.cart.length) {
        errors.cart = 'Giỏ hàng đang trống.';
    }

    if (draft.cash < 0 || !Number.isInteger(draft.cash)) {
        errors.cash = 'Tiền mặt phải là số nguyên không âm.';
    }

    if (draft.qr < 0 || !Number.isInteger(draft.qr)) {
        errors.qr = 'Tiền QR phải là số nguyên không âm.';
    }

    if (draft.qr > draft.total) {
        errors.qr = 'Tiền QR không được lớn hơn tổng hóa đơn.';
    }

    for (const line of draft.cart) {
        if (line.quantity <= 0 || !Number.isFinite(line.quantity)) {
            errors.quantity = 'Số lượng phải lớn hơn 0.';
            break;
        }
        if (!line.productUnit.allows_fractional_quantity && !Number.isInteger(line.quantity)) {
            errors.quantity = `Đơn vị ${line.productUnit.unit.name} chỉ nhận số lượng nguyên.`;
            break;
        }
        if (line.discount < 0 || line.discount > Math.round(line.unitPrice * line.quantity)) {
            errors.discount = `Giảm giá của ${line.product.name} không hợp lệ.`;
            break;
        }
    }

    if (draft.debt > 0 && !draft.customerId) {
        errors.customerId = 'Cần chọn khách hàng khi hóa đơn còn nợ.';
    }

    if (draft.qr > 0 && !draft.qrConfirmed) {
        errors.qr = 'Hãy xác nhận đã thấy tiền QR vào tài khoản.';
    }

    if (!draft.online && draft.overrideNeeded) {
        errors.offline = 'Sửa giá/giảm giá cần PIN chủ cửa hàng và phải chờ đến khi online.';
    }

    return errors;
}
