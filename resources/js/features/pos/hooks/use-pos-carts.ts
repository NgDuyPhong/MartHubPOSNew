import { useCallback, useEffect, useRef, useState } from 'react';
import { getCartDrafts, saveCartDrafts } from '../api/cart-draft-repository';
import type { CartDraft, CheckoutDraftSnapshot } from '../model/types';
import { usePosCart } from './use-pos-cart';

function newDraft(name: string, active: boolean): CartDraft {
    return {
        id: crypto.randomUUID(),
        name,
        cart: [],
        checkout: { customerId: null, cash: 0, qr: 0, qrConfirmed: false },
        active,
        updatedAt: new Date().toISOString(),
    };
}

function markActive(drafts: CartDraft[], activeCartId: string): CartDraft[] {
    return drafts.map((draft) => ({ ...draft, active: draft.id === activeCartId }));
}

export function usePosCarts() {
    const cartState = usePosCart();
    const { cart, replaceCart } = cartState;
    const [drafts, setDrafts] = useState<CartDraft[]>([]);
    const [activeCartId, setActiveCartId] = useState<string | null>(null);
    const [ready, setReady] = useState(false);
    const draftsRef = useRef(drafts);

    useEffect(() => {
        draftsRef.current = drafts;
    }, [drafts]);

    useEffect(() => {
        let mounted = true;

        void getCartDrafts()
            .then((storedDrafts) => {
                if (!mounted) return;
                const nextDrafts = storedDrafts.length ? storedDrafts : [newDraft('Đơn mới', true)];
                const activeDraft = nextDrafts.find((draft) => draft.active) ?? nextDrafts[0];
                const normalizedDrafts = markActive(nextDrafts, activeDraft.id);
                setDrafts(normalizedDrafts);
                setActiveCartId(activeDraft.id);
                replaceCart(activeDraft.cart);
                setReady(true);
            })
            .catch(() => {
                if (!mounted) return;
                const fallbackDraft = newDraft('Đơn mới', true);
                setDrafts([fallbackDraft]);
                setActiveCartId(fallbackDraft.id);
                setReady(true);
            });

        return () => {
            mounted = false;
        };
    }, [replaceCart]);

    useEffect(() => {
        if (!ready) return;

        const timer = window.setTimeout(() => void saveCartDrafts(drafts), 350);

        return () => window.clearTimeout(timer);
    }, [drafts, ready]);

    useEffect(() => {
        const flushDrafts = () => {
            if (ready) void saveCartDrafts(draftsRef.current);
        };

        window.addEventListener('visibilitychange', flushDrafts);
        return () => window.removeEventListener('visibilitychange', flushDrafts);
    }, [ready]);

    const activeDraft = drafts.find((draft) => draft.id === activeCartId) ?? null;

    const persistActiveCart = useCallback(
        (checkout: CheckoutDraftSnapshot) => {
            if (!ready || !activeCartId) return;
            setDrafts((current) =>
                current.map((draft) =>
                    draft.id === activeCartId ? { ...draft, cart, checkout, updatedAt: new Date().toISOString(), active: true } : draft,
                ),
            );
        },
        [activeCartId, cart, ready],
    );

    const createCart = useCallback(
        (checkout: CheckoutDraftSnapshot, name = 'Đơn mới'): CartDraft => {
            const draft = newDraft(name, true);
            setDrafts((current) => [
                ...markActive(
                    current.map((item) => (item.id === activeCartId ? { ...item, cart, checkout, updatedAt: new Date().toISOString() } : item)),
                    draft.id,
                ),
                draft,
            ]);
            setActiveCartId(draft.id);
            replaceCart([]);
            return draft;
        },
        [activeCartId, cart, replaceCart],
    );

    const holdCart = useCallback((checkout: CheckoutDraftSnapshot): CartDraft => createCart(checkout, 'Đơn đang giữ'), [createCart]);

    const switchCart = useCallback(
        (targetId: string, checkout: CheckoutDraftSnapshot): CartDraft | null => {
            const target = drafts.find((draft) => draft.id === targetId);
            if (!target || target.id === activeCartId) return target ?? null;

            setDrafts((current) =>
                markActive(
                    current.map((draft) => (draft.id === activeCartId ? { ...draft, cart, checkout, updatedAt: new Date().toISOString() } : draft)),
                    targetId,
                ),
            );
            setActiveCartId(targetId);
            replaceCart(target.cart);
            return target;
        },
        [activeCartId, cart, drafts, replaceCart],
    );

    const renameCart = useCallback((id: string, name: string) => {
        const nextName = name.trim().slice(0, 32);
        if (!nextName) return;
        setDrafts((current) => current.map((draft) => (draft.id === id ? { ...draft, name: nextName, updatedAt: new Date().toISOString() } : draft)));
    }, []);

    const deleteCart = useCallback(
        (id: string): boolean => {
            if (id === activeCartId || drafts.length <= 1) return false;
            setDrafts((current) => current.filter((draft) => draft.id !== id));
            return true;
        },
        [activeCartId, drafts.length],
    );

    return {
        ...cartState,
        drafts,
        activeCartId,
        activeDraft,
        ready,
        persistActiveCart,
        createCart,
        holdCart,
        switchCart,
        renameCart,
        deleteCart,
    };
}
