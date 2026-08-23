import { cn } from '@/lib/utils';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';

interface FilterBarProps extends Omit<ComponentPropsWithoutRef<'div'>, 'children'> {
    children: ReactNode;
}

export function FilterBar({ children, className, ...props }: FilterBarProps) {
    return (
        <div className={cn('bg-card flex min-w-0 flex-col gap-3 rounded-lg border p-3 md:flex-row md:flex-wrap md:items-end', className)} {...props}>
            {children}
        </div>
    );
}
