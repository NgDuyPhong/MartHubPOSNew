import { useCallback, useState } from 'react';
import type { CartLine, Product, ProductUnit, Variant } from '../model/types';

export function getCartLineKey(variant: Variant, productUnit: ProductUnit): string {
    return `${variant.id}-${productUnit.id}`;
}

export function replaceCartLineSelection(cart: CartLine[], key: string, product: Product, variant: Variant, productUnit: ProductUnit): CartLine[] {
    const source = cart.find((line) => line.key === key);
    if (!source) return cart;

    const nextKey = getCartLineKey(variant, productUnit);
    if (nextKey === source.key) return cart;

    const target = cart.find((line) => line.key === nextKey);
    if (target) {
        return cart
            .filter((line) => line.key !== source.key)
            .map((line) => (line.key === nextKey ? { ...line, product, variant, productUnit, quantity: line.quantity + source.quantity } : line));
    }

    return cart.map((line) =>
        line.key === source.key ? { ...line, key: nextKey, product, variant, productUnit, unitPrice: productUnit.sale_price, discount: 0 } : line,
    );
}

export function usePosCart() {
    const [cart, setCart] = useState<CartLine[]>([]);
    const [selectedKey, setSelectedKey] = useState<string | null>(null);

    const addLine = useCallback((product: Product, variant: Variant, productUnit: ProductUnit) => {
        const key = getCartLineKey(variant, productUnit);
        setCart((lines) => {
            const existing = lines.find((line) => line.key === key);
            return existing
                ? lines.map((line) => (line.key === key ? { ...line, quantity: line.quantity + 1 } : line))
                : [...lines, { key, product, variant, productUnit, quantity: 1, unitPrice: productUnit.sale_price, discount: 0 }];
        });
        setSelectedKey(key);
    }, []);

    const changeLineSelection = useCallback((key: string, product: Product, variant: Variant, productUnit: ProductUnit) => {
        setCart((lines) => replaceCartLineSelection(lines, key, product, variant, productUnit));
        setSelectedKey(getCartLineKey(variant, productUnit));
    }, []);

    const updateLine = useCallback((key: string, values: Partial<CartLine>) => {
        setCart((lines) => lines.map((line) => (line.key === key ? { ...line, ...values } : line)));
    }, []);

    const removeLine = useCallback((key: string) => {
        setCart((lines) => lines.filter((line) => line.key !== key));
        setSelectedKey((current) => (current === key ? null : current));
    }, []);

    const clearCart = useCallback(() => {
        setCart([]);
        setSelectedKey(null);
    }, []);

    const replaceCart = useCallback((nextCart: CartLine[]) => {
        setCart(nextCart);
        setSelectedKey(nextCart[0]?.key ?? null);
    }, []);

    return { cart, selectedKey, addLine, changeLineSelection, updateLine, removeLine, clearCart, replaceCart, selectLine: setSelectedKey };
}
