import { cn } from '@/lib/utils';
import type { HTMLAttributes } from 'react';

export function FieldError({
    id,
    message,
    className,
    ...props
}: Omit<HTMLAttributes<HTMLParagraphElement>, 'children'> & { id?: string; message?: string }) {
    if (!message) {
        return null;
    }

    return (
        <p {...props} id={id} role="alert" className={cn('text-destructive text-xs', className)}>
            {message}
        </p>
    );
}
