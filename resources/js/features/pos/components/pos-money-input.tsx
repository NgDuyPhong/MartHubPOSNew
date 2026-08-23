import { MoneyInput, type MoneyValue } from '@/components/shared';
import type { ComponentProps } from 'react';
import { useEffect, useRef, useState } from 'react';

type PosMoneyInputProps = Omit<ComponentProps<typeof MoneyInput>, 'value' | 'onValueChange'> & {
    value: number;
    onValueChange: (value: number) => void;
};

export function PosMoneyInput({ value, onValueChange, ...props }: PosMoneyInputProps) {
    const [draft, setDraft] = useState<MoneyValue>(value);
    const lastOwnerValue = useRef(value);

    useEffect(() => {
        if (value !== lastOwnerValue.current) {
            setDraft(value);
            lastOwnerValue.current = value;
        }
    }, [value]);

    const restoreLastValidValue = () => {
        if (draft === '') {
            setDraft(lastOwnerValue.current);
        }
    };

    return (
        <MoneyInput
            {...props}
            value={draft}
            onValueChange={(nextValue) => {
                setDraft(nextValue);

                if (nextValue !== '') {
                    lastOwnerValue.current = nextValue;
                    onValueChange(nextValue);
                }
            }}
            onBlur={(event) => {
                restoreLastValidValue();

                props.onBlur?.(event);
            }}
            onKeyDown={(event) => {
                if (event.key === 'Enter') {
                    restoreLastValidValue();
                }

                props.onKeyDown?.(event);
            }}
        />
    );
}
