import { cn } from '@/lib/utils';
import * as React from 'react';

export const NativeSelect = React.forwardRef<HTMLSelectElement, React.ComponentProps<'select'>>(function NativeSelect(
    { className, ...props },
    ref,
) {
    return (
        <select
            {...props}
            ref={ref}
            className={cn(
                'bg-background flex h-10 w-full rounded-md border border-input px-3 py-2 text-sm ring-offset-background focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
                className,
            )}
        />
    );
});

NativeSelect.displayName = 'NativeSelect';
