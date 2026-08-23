import { cn } from '@/lib/utils';
import type { ComponentPropsWithoutRef } from 'react';

export function PageShell({ className, children, ...props }: ComponentPropsWithoutRef<'div'>) {
    return (
        <div className={cn('flex min-w-0 flex-1 flex-col gap-4 p-4 md:p-5 lg:p-6', className)} {...props}>
            {children}
        </div>
    );
}
