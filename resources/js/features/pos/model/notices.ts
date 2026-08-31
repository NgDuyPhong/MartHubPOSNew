export const POS_NOTICE_DURATIONS = {
    transient: 5000,
    cartUndo: 8000,
} as const;

export type PosNoticeTone = 'info' | 'success' | 'warning' | 'error';

export type PosNoticeKind = 'standard' | 'cart-cleared';

export type PosNotice = {
    id: string;
    message: string;
    tone: PosNoticeTone;
    autoDismissMs?: number;
    kind?: PosNoticeKind;
};

let noticeSequence = 0;

export function createPosNotice(
    message: string,
    tone: PosNoticeTone,
    options: { autoDismissMs?: number | null; kind?: PosNoticeKind } = {},
): PosNotice {
    noticeSequence += 1;

    return {
        id: `pos-notice-${noticeSequence}`,
        message,
        tone,
        autoDismissMs:
            options.autoDismissMs === null
                ? undefined
                : (options.autoDismissMs ?? (tone === 'info' || tone === 'success' ? POS_NOTICE_DURATIONS.transient : undefined)),
        kind: options.kind,
    };
}
