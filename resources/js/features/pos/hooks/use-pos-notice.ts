import { useCallback, useRef, useState } from 'react';
import { createPosNotice, type PosNotice, type PosNoticeKind, type PosNoticeTone } from '../model/notices';
import type { CartLine } from '../model/types';

export type PosNoticeOptions = {
    autoDismissMs?: number | null;
    kind?: PosNoticeKind;
};

export function usePosNoticeState() {
    const [message, setMessage] = useState<PosNotice | null>(null);
    const [undoCart, setUndoCart] = useState<CartLine[]>([]);
    const messageRef = useRef<PosNotice | null>(null);

    const setPosMessage = useCallback((nextMessage: PosNotice | null) => {
        messageRef.current = nextMessage;
        setMessage(nextMessage);
        if (nextMessage === null || nextMessage.kind !== 'cart-cleared') setUndoCart([]);
    }, []);

    const showNotice = useCallback(
        (noticeMessage: string, tone: PosNoticeTone, options?: PosNoticeOptions): PosNotice => {
            const notice = createPosNotice(noticeMessage, tone, options);
            setPosMessage(notice);

            return notice;
        },
        [setPosMessage],
    );

    return { message, messageRef, undoCart, setUndoCart, setPosMessage, showNotice };
}
