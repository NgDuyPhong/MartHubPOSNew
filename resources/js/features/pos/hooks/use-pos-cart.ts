import { useCallback, useState } from 'react';
import type { CartLine, Product, ProductUnit, Variant } from '../model/types';

export function usePosCart() {
    const [cart, setCart] = useState<CartLine[]>([]);
    const [selectedKey, setSelectedKey] = useState<string | null>(null);

    const addLine = useCallback((product: Product, variant: Variant, productUnit: ProductUnit) => {
        const key = `${variant.id}-${productUnit.id}`;
        setCart((lines) => {
            const existing = lines.find((line) => line.key === key);
            return existing
                ? lines.map((line) => (line.key === key ? { ...line, quantity: line.quantity + 1 } : line))
                : [...lines, { key, product, variant, productUnit, quantity: 1, unitPrice: productUnit.sale_price, discount: 0 }];
        });
        setSelectedKey(key);
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

    return { cart, selectedKey, addLine, updateLine, removeLine, clearCart, replaceCart, selectLine: setSelectedKey };
}
