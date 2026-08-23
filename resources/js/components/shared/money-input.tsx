import { Input } from '@/components/ui/input';
import * as React from 'react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';

export type MoneyValue = number | '';

type MoneyInputProps = Omit<React.ComponentProps<'input'>, 'type' | 'inputMode' | 'value' | 'onChange'> & {
    value: MoneyValue;
    onValueChange: (value: MoneyValue) => void;
    min?: number;
    max?: number;
    invalid?: boolean;
    syncKey?: string | number;
};

const moneyFormatter = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 });

export function formatMoneyInputValue(value: MoneyValue): string {
    return value === '' ? '' : moneyFormatter.format(value);
}

export function parseMoneyInputValue(rawValue: string): MoneyValue {
    const digits = rawValue.replace(/\D/g, '');

    if (digits === '') {
        return '';
    }

    const normalized = digits.replace(/^0+(?=\d)/, '');
    const value = Number(normalized);

    return Number.isSafeInteger(value) ? value : '';
}

function countDigitsBeforeCaret(rawValue: string, caret: number): number {
    const digits = rawValue.slice(0, caret).replace(/\D/g, '');

    return digits.replace(/^0+/, '').length || (digits.length > 0 ? digits.length : 0);
}

function caretAfterDigitCount(formattedValue: string, digitCount: number): number {
    if (digitCount <= 0) {
        return 0;
    }

    let seenDigits = 0;

    for (let index = 0; index < formattedValue.length; index += 1) {
        if (/\d/.test(formattedValue[index])) {
            seenDigits += 1;
        }

        if (seenDigits === digitCount) {
            return index + 1;
        }
    }

    return formattedValue.length;
}

export const MoneyInput = React.forwardRef<HTMLInputElement, MoneyInputProps>(function MoneyInput(
    { className, value, onValueChange, min, max, invalid, syncKey, onBlur, required, ...props },
    ref,
) {
    const inputRef = useRef<HTMLInputElement | null>(null);
    const pendingCaret = useRef<number | null>(null);
    const lastExternalValue = useRef<MoneyValue>(value);
    const lastSyncKey = useRef<string | number | undefined>(syncKey);
    const [draft, setDraft] = useState(() => formatMoneyInputValue(value));
    const outOfRange = value !== '' && ((min !== undefined && value < min) || (max !== undefined && value > max));

    const setInputRef = (node: HTMLInputElement | null) => {
        inputRef.current = node;

        if (typeof ref === 'function') {
            ref(node);
        } else if (ref) {
            ref.current = node;
        }
    };

    useEffect(() => {
        const valueChanged = lastExternalValue.current !== value;
        const syncKeyChanged = lastSyncKey.current !== syncKey;

        if (valueChanged || syncKeyChanged) {
            setDraft(formatMoneyInputValue(value));
            lastExternalValue.current = value;
            lastSyncKey.current = syncKey;
        }
    }, [syncKey, value]);

    useLayoutEffect(() => {
        const input = inputRef.current;

        if (!input || pendingCaret.current === null || input !== document.activeElement) {
            return;
        }

        const position = caretAfterDigitCount(draft, pendingCaret.current);
        input.setSelectionRange(position, position);
        pendingCaret.current = null;
    }, [draft]);

    return (
        <Input
            {...props}
            ref={setInputRef}
            type="text"
            inputMode="numeric"
            required={required}
            className={className}
            value={draft}
            min={undefined}
            max={undefined}
            aria-invalid={invalid || outOfRange ? true : undefined}
            onChange={(event) => {
                const rawValue = event.currentTarget.value;
                const caret = event.currentTarget.selectionStart ?? rawValue.length;
                const nextValue = parseMoneyInputValue(rawValue);

                pendingCaret.current = countDigitsBeforeCaret(rawValue, caret);
                setDraft(formatMoneyInputValue(nextValue));
                onValueChange(nextValue);
            }}
            onBlur={(event) => {
                if (draft === '' && value !== '') {
                    setDraft(formatMoneyInputValue(value));
                }

                onBlur?.(event);
            }}
        />
    );
});

MoneyInput.displayName = 'MoneyInput';
