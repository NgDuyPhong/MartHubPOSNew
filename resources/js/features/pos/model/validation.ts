import type { CartLine } from './types';

export type CheckoutDraft = {
    cart: CartLine[];
    debt: number;
    customerId: number | null;
    qr: number;
    qrConfirmed: boolean;
    online: boolean;
    overrideNeeded: boolean;
};

export type CheckoutErrors = Partial<Record<'cart' | 'customerId' | 'qr' | 'offline', string>>;

export function validateCheckout(draft: CheckoutDraft): CheckoutErrors {
    const errors: CheckoutErrors = {};

    if (!draft.cart.length) {
        errors.cart = 'Giỏ hàng đang trống.';
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
