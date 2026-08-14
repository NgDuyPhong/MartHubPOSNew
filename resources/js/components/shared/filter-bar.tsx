import type { ReactNode } from 'react';

export function FilterBar({ children }: { children: ReactNode }) {
    return <div className="flex flex-col gap-3 rounded-lg border bg-card p-3 shadow-sm md:flex-row md:flex-wrap md:items-center">{children}</div>;
}
