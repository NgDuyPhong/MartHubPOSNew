import { Button } from '@/components/ui/button';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { PosNotice, PosNoticeTone } from '../model/notices';

const noticeToneClasses: Record<PosNoticeTone, string> = {
    info: 'bg-info-muted text-info-muted-foreground border-info/30',
    success: 'bg-success-muted text-success-muted-foreground border-success/30',
    warning: 'bg-warning-muted text-warning-muted-foreground border-warning/40',
    error: 'bg-destructive/10 text-destructive border-destructive/30',
};

export function PosNotices({
    message,
    undoCartCount,
    hasStaleCartPrice,
    unavailableCartLineCount,
    onUndo,
    onDismiss,
}: {
    message: PosNotice | null;
    undoCartCount: number;
    hasStaleCartPrice: boolean;
    unavailableCartLineCount: number;
    onUndo: () => void;
    onDismiss: () => void;
}) {
    const [visible, setVisible] = useState(Boolean(message));
    const timerRef = useRef<number | null>(null);
    const deadlineRef = useRef(0);
    const remainingRef = useRef(0);
    const pointerInsideRef = useRef(false);
    const focusWithinRef = useRef(false);
    const onDismissRef = useRef(onDismiss);

    useEffect(() => {
        onDismissRef.current = onDismiss;
    }, [onDismiss]);

    const clearTimer = useCallback(() => {
        if (timerRef.current !== null) {
            window.clearTimeout(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    const dismiss = useCallback(() => {
        clearTimer();
        setVisible(false);
        onDismissRef.current();
    }, [clearTimer]);

    const scheduleTimer = useCallback(
        (delayMs: number) => {
            clearTimer();

            if (delayMs <= 0) {
                dismiss();
                return;
            }

            remainingRef.current = delayMs;
            deadlineRef.current = Date.now() + delayMs;
            timerRef.current = window.setTimeout(dismiss, delayMs);
        },
        [clearTimer, dismiss],
    );

    useEffect(() => {
        clearTimer();
        pointerInsideRef.current = false;
        focusWithinRef.current = false;

        if (!message) {
            setVisible(false);
            return;
        }

        setVisible(true);
        remainingRef.current = message.autoDismissMs ?? 0;

        if (message.autoDismissMs !== undefined) {
            scheduleTimer(message.autoDismissMs);
        }

        return clearTimer;
    }, [clearTimer, message, scheduleTimer]);

    const pauseTimer = useCallback(() => {
        if (timerRef.current === null) return;

        remainingRef.current = Math.max(0, deadlineRef.current - Date.now());
        clearTimer();
    }, [clearTimer]);

    const resumeTimer = useCallback(() => {
        if (pointerInsideRef.current || focusWithinRef.current || !message || !visible || message.autoDismissMs === undefined) return;

        if (remainingRef.current <= 0) {
            dismiss();
            return;
        }

        scheduleTimer(remainingRef.current);
    }, [dismiss, message, scheduleTimer, visible]);

    const handleBlurCapture = (event: React.FocusEvent<HTMLDivElement>) => {
        if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;

        focusWithinRef.current = false;
        resumeTimer();
    };

    if (!message || !visible) {
        return hasStaleCartPrice || unavailableCartLineCount > 0 ? (
            <div className="flex flex-col gap-2">
                {hasStaleCartPrice && <StalePriceNotice />}
                {unavailableCartLineCount > 0 && <UnavailableNotice count={unavailableCartLineCount} />}
            </div>
        ) : null;
    }

    return (
        <div className="flex flex-col gap-2">
            <div
                className={`flex flex-wrap items-start justify-between gap-3 rounded-md border px-3 py-2 text-sm ${noticeToneClasses[message.tone]}`}
                role={message.tone === 'error' ? 'alert' : 'status'}
                aria-live={message.tone === 'error' ? 'assertive' : 'polite'}
                aria-atomic="true"
                onMouseEnter={() => {
                    pointerInsideRef.current = true;
                    pauseTimer();
                }}
                onMouseLeave={() => {
                    pointerInsideRef.current = false;
                    resumeTimer();
                }}
                onFocusCapture={() => {
                    focusWithinRef.current = true;
                    pauseTimer();
                }}
                onBlurCapture={handleBlurCapture}
            >
                <span className="min-w-0 flex-1">{message.message}</span>
                <div className="flex w-full shrink-0 items-center justify-end gap-2 sm:w-auto">
                    {undoCartCount > 0 && (
                        <Button size="sm" variant="outline" onClick={onUndo}>
                            Hoàn tác
                        </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={dismiss}>
                        Đóng
                    </Button>
                </div>
            </div>
            {hasStaleCartPrice && <StalePriceNotice />}
            {unavailableCartLineCount > 0 && <UnavailableNotice count={unavailableCartLineCount} />}
        </div>
    );
}

function StalePriceNotice() {
    return (
        <div className="border-warning/40 bg-warning-muted text-warning-muted-foreground rounded-md border px-3 py-2 text-sm" role="status">
            Giá catalog đã thay đổi; dòng hàng đang có trong giỏ vẫn giữ giá cũ. Sản phẩm thêm mới sẽ dùng giá hiện tại.
        </div>
    );
}

function UnavailableNotice({ count }: { count: number }) {
    return (
        <div className="border-destructive/30 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm" role="alert">
            Có {count} dòng hàng không còn khả dụng. Hãy xóa dòng đó và chọn sản phẩm khác trước khi thanh toán.
        </div>
    );
}
