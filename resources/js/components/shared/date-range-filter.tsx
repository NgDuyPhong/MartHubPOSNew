import { FieldError } from '@/components/shared/field-error';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import { ArrowRight, CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useId, useState } from 'react';

const weekDays = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

function parseDate(value: string): Date {
    const [year, month, day] = value.split('-').map(Number);

    return new Date(year, month - 1, day);
}

function toDateValue(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

function startOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, amount: number): Date {
    return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function formatDate(value: string | null): string {
    return value ? new Intl.DateTimeFormat('vi-VN').format(parseDate(value)) : 'Chọn ngày';
}

function MonthCalendar({
    month,
    from,
    to,
    min,
    max,
    onSelect,
}: {
    month: Date;
    from: string | null;
    to: string | null;
    min?: string;
    max?: string;
    onSelect: (value: string) => void;
}) {
    const year = month.getFullYear();
    const monthIndex = month.getMonth();
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const leadingDays = (new Date(year, monthIndex, 1).getDay() + 6) % 7;
    const monthLabel = new Intl.DateTimeFormat('vi-VN', { month: 'long', year: 'numeric' }).format(month);

    return (
        <section className="w-72" aria-label={monthLabel}>
            <h3 className="text-center text-sm font-semibold capitalize">{monthLabel}</h3>
            <div className="text-muted-foreground mt-3 grid grid-cols-7 text-center text-xs font-medium" aria-hidden="true">
                {weekDays.map((day) => (
                    <span key={day} className="py-2">
                        {day}
                    </span>
                ))}
            </div>
            <div className="grid grid-cols-7" role="grid" aria-label={monthLabel}>
                {Array.from({ length: leadingDays }, (_, index) => (
                    <span key={`empty-${index}`} className="size-10" aria-hidden="true" />
                ))}
                {Array.from({ length: daysInMonth }, (_, index) => {
                    const day = index + 1;
                    const value = toDateValue(new Date(year, monthIndex, day));
                    const isDisabled = Boolean((min && value < min) || (max && value > max));
                    const isStart = value === from;
                    const isEnd = value === to;
                    const isInRange = Boolean(from && to && value > from && value < to);
                    const isToday = value === toDateValue(new Date());

                    return (
                        <button
                            key={value}
                            type="button"
                            role="gridcell"
                            disabled={isDisabled}
                            aria-label={new Intl.DateTimeFormat('vi-VN', { dateStyle: 'full' }).format(parseDate(value))}
                            aria-selected={isStart || isEnd || isInRange}
                            onClick={() => onSelect(value)}
                            className={cn(
                                'focus-visible:ring-ring relative flex size-10 items-center justify-center text-sm transition-colors focus-visible:z-10 focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-30',
                                isInRange && 'bg-primary/10 text-foreground',
                                isStart && to && 'rounded-l-md',
                                isEnd && from && 'rounded-r-md',
                                (isStart || isEnd) && 'bg-primary text-primary-foreground hover:bg-primary/90',
                                !isStart && !isEnd && !isInRange && 'hover:bg-accent hover:text-accent-foreground rounded-md',
                                isToday &&
                                    !isStart &&
                                    !isEnd &&
                                    'text-primary after:bg-primary font-semibold after:absolute after:bottom-1 after:size-1 after:rounded-full',
                            )}
                        >
                            {day}
                        </button>
                    );
                })}
            </div>
        </section>
    );
}

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
    const id = useId();
    const errorId = `date-range-filter-error-${id}`;
    const rangeError = error ?? getDateRangeError(from, to);
    const hasValue = Boolean(from || to);
    const initialMonth = from ? parseDate(from) : to ? parseDate(to) : new Date();
    const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(initialMonth));

    const clearRange = () => {
        onFromChange(null);
        onToChange(null);
    };

    const selectDate = (value: string, close: () => void) => {
        if (!from || to) {
            onFromChange(value);
            onToChange(null);

            return;
        }

        if (value < from) {
            onFromChange(value);

            return;
        }

        onToChange(value);
        close();
    };

    const previousMonth = addMonths(visibleMonth, -1);
    const nextMonth = addMonths(visibleMonth, 1);
    const canGoPrevious = !min || toDateValue(new Date(previousMonth.getFullYear(), previousMonth.getMonth() + 1, 0)) >= min;
    const canGoNext = !max || toDateValue(nextMonth) <= max;

    return (
        <fieldset className="flex min-w-0 flex-1 flex-col gap-2" disabled={disabled}>
            <legend className="sr-only">Khoảng ngày</legend>
            <div className="flex items-center justify-between gap-3">
                <div className="text-muted-foreground flex items-center gap-2 text-xs font-medium" aria-hidden="true">
                    <CalendarDays className="size-4" />
                    <span>Khoảng ngày</span>
                </div>
                {hasValue ? (
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-foreground size-8"
                        onClick={clearRange}
                        aria-label="Xóa khoảng ngày"
                    >
                        <X aria-hidden="true" />
                    </Button>
                ) : null}
            </div>
            <Popover className="relative min-w-0">
                {({ close }) => (
                    <>
                        <PopoverButton
                            className={cn(
                                'bg-background grid w-full min-w-0 items-stretch rounded-md border p-1 text-left transition-colors outline-none sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]',
                                rangeError ? 'border-destructive/70' : 'border-input',
                                'focus-visible:border-ring focus-visible:ring-ring/20 focus-visible:ring-2',
                            )}
                            aria-label="Chọn khoảng ngày"
                            aria-describedby={rangeError ? errorId : undefined}
                            aria-invalid={Boolean(rangeError)}
                        >
                            <span className="hover:bg-accent/50 flex min-w-0 flex-col items-start gap-1 rounded-sm px-3 py-2">
                                <span className="text-muted-foreground text-xs font-medium">Từ ngày</span>
                                <span className={cn('text-sm', !from && 'text-muted-foreground')}>{formatDate(from)}</span>
                            </span>
                            <span className="text-muted-foreground hidden items-center px-1 sm:flex" aria-hidden="true">
                                <ArrowRight className="size-4" />
                            </span>
                            <span className="hover:bg-accent/50 flex min-w-0 flex-col items-start gap-1 rounded-sm px-3 py-2">
                                <span className="text-muted-foreground text-xs font-medium">Đến ngày</span>
                                <span className={cn('text-sm', !to && 'text-muted-foreground')}>{formatDate(to)}</span>
                            </span>
                        </PopoverButton>
                        <PopoverPanel
                            transition
                            className="bg-popover text-popover-foreground absolute top-full left-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] origin-top-left rounded-lg border p-3 shadow-lg transition duration-150 data-closed:-translate-y-1 data-closed:opacity-0 sm:w-auto sm:p-4"
                        >
                            <div className="mb-3 flex items-center justify-between gap-3">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="size-9"
                                    disabled={!canGoPrevious}
                                    onClick={() => setVisibleMonth(previousMonth)}
                                    aria-label="Tháng trước"
                                >
                                    <ChevronLeft aria-hidden="true" />
                                </Button>
                                <p className="text-muted-foreground text-center text-xs">Chọn ngày bắt đầu, sau đó chọn ngày kết thúc</p>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="size-9"
                                    disabled={!canGoNext}
                                    onClick={() => setVisibleMonth(nextMonth)}
                                    aria-label="Tháng sau"
                                >
                                    <ChevronRight aria-hidden="true" />
                                </Button>
                            </div>
                            <div className="flex gap-4">
                                <MonthCalendar
                                    month={visibleMonth}
                                    from={from}
                                    to={to}
                                    min={min}
                                    max={max}
                                    onSelect={(value) => selectDate(value, close)}
                                />
                                <div className="hidden border-l pl-4 sm:block">
                                    <MonthCalendar
                                        month={nextMonth}
                                        from={from}
                                        to={to}
                                        min={min}
                                        max={max}
                                        onSelect={(value) => selectDate(value, close)}
                                    />
                                </div>
                            </div>
                        </PopoverPanel>
                    </>
                )}
            </Popover>
            <FieldError id={errorId} message={rangeError} />
        </fieldset>
    );
}
