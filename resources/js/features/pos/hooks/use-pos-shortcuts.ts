import { useEffect } from 'react';

type ShortcutOptions = {
    cartLength: number;
    checkoutExpanded: boolean;
    total: number;
    selectedKey: string | null;
    clearCart: () => void;
    removeLine: (key: string) => void;
    setCash: (value: number) => void;
    expandCheckout: () => void;
    collapseCheckout: () => void;
    searchRef: React.RefObject<HTMLInputElement | null>;
    checkoutRef: React.RefObject<HTMLDivElement | null>;
    confirmCheckoutRef: React.RefObject<HTMLButtonElement | null>;
};

export function usePosShortcuts(options: ShortcutOptions): void {
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'F3') {
                event.preventDefault();
                options.searchRef.current?.focus();
            }
            if (event.key === 'F8') {
                event.preventDefault();
                options.clearCart();
            }
            if (event.key === 'F9' && options.cartLength) {
                event.preventDefault();
                options.setCash(options.total);
                options.expandCheckout();
                window.setTimeout(() => options.confirmCheckoutRef.current?.focus(), 0);
            }
            if (event.key === 'F12' && options.cartLength) {
                event.preventDefault();
                options.expandCheckout();
                window.setTimeout(() => options.checkoutRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 0);
            }
            if (event.key === 'Escape' && options.checkoutExpanded) {
                event.preventDefault();
                options.collapseCheckout();
                options.searchRef.current?.focus();
            }
            if (event.key === 'Delete' && options.selectedKey) {
                options.removeLine(options.selectedKey);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [options]);
}
