import { FieldError } from '@/components/shared/field-error';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function getDateRangeError(from: string | null | undefined, to: string | null | undefined): string | undefined {
    return from && to && from > to ? 'Ngày bắt đầu không được sau ngày kết thúc.' : undefined;
}

export function DateRangeFilter({
    from,
    to,
    onFromChange,
    onToChange,
    min,
    max,
    disabled = false,
    error,
}: {
    from: string | null;
    to: string | null;
    onFromChange: (value: string | null) => void;
    onToChange: (value: string | null) => void;
    min?: string;
    max?: string;
    disabled?: boolean;
    error?: string;
}) {
    const rangeError = error ?? getDateRangeError(from, to);
    const errorId = 'date-range-filter-error';

    return (
        <fieldset className="flex min-w-0 flex-1 flex-col gap-2" disabled={disabled}>
            <legend className="text-sm font-medium">Khoảng ngày</legend>
            <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                <div className="flex min-w-0 flex-col gap-2">
                    <Label htmlFor="date-range-from">Từ ngày</Label>
                    <Input
                        id="date-range-from"
                        type="date"
                        value={from ?? ''}
                        min={min}
                        max={max}
                        aria-invalid={Boolean(rangeError)}
                        aria-describedby={rangeError ? errorId : undefined}
                        onChange={(event) => onFromChange(event.target.value || null)}
                    />
                </div>
                <div className="flex min-w-0 flex-col gap-2">
                    <Label htmlFor="date-range-to">Đến ngày</Label>
                    <Input
                        id="date-range-to"
                        type="date"
                        value={to ?? ''}
                        min={min}
                        max={max}
                        aria-invalid={Boolean(rangeError)}
                        aria-describedby={rangeError ? errorId : undefined}
                        onChange={(event) => onToChange(event.target.value || null)}
                    />
                </div>
            </div>
            <FieldError id={errorId} message={rangeError} />
        </fieldset>
    );
}
