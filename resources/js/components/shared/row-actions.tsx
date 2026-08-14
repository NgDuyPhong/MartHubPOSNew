import type { ReactNode } from 'react';

export function RowActions({ primary, secondary }: { primary?: ReactNode; secondary?: ReactNode }) {
    return (
        <div className="flex items-center justify-end gap-1">
            {primary}
            {secondary}
        </div>
    );
}
