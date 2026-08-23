import { Input } from '@/components/ui/input';
import { Search, X } from 'lucide-react';
import { useId } from 'react';

export function SearchField({
    value,
    onChange,
    placeholder = 'Tìm kiếm…',
    isLoading = false,
}: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    isLoading?: boolean;
}) {
    const id = useId();

    return (
        <div className="relative min-w-0 flex-1">
            <label htmlFor={id} className="sr-only">
                Tìm kiếm
            </label>
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" aria-hidden="true" />
            <Input id={id} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="pr-9 pl-9" />
            {isLoading ? (
                <span className="text-muted-foreground absolute top-1/2 right-3 -translate-y-1/2 text-xs" aria-live="polite">
                    Đang tìm…
                </span>
            ) : value ? (
                <button
                    type="button"
                    onClick={() => onChange('')}
                    className="text-muted-foreground hover:text-foreground focus-visible:ring-ring absolute top-1/2 right-2 -translate-y-1/2 rounded-sm p-1 focus-visible:ring-2"
                    aria-label="Xóa tìm kiếm"
                >
                    <X className="size-4" />
                </button>
            ) : null}
        </div>
    );
}
