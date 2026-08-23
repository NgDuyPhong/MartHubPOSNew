import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';

const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

export function useFocusReturn(open: boolean) {
    const previouslyFocused = useRef<HTMLElement | null>(null);
    const wasOpen = useRef(false);

    const captureFocus = useCallback(() => {
        const activeElement = document.activeElement;
        previouslyFocused.current = activeElement instanceof HTMLElement && activeElement !== document.body ? activeElement : null;
    }, []);

    useIsomorphicLayoutEffect(() => {
        if (open && !wasOpen.current) {
            captureFocus();
        }

        wasOpen.current = open;
    }, [captureFocus, open]);

    const restoreFocus = useCallback(() => {
        const element = previouslyFocused.current;
        if (!element) {
            return;
        }

        const focus = () => {
            if (document.contains(element)) element.focus();
        };

        focus();
        window.requestAnimationFrame(focus);
        window.setTimeout(focus, 0);
    }, []);

    return { captureFocus, restoreFocus };
}
