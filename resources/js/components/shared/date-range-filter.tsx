import { FieldError } from '@/components/shared/field-error';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import { ArrowRight, CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useCallback, useEffect, useId, useMemo, useState, type KeyboardEvent } from 'react';

const weekDays = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const monthNames = Array.from({ length: 12 }, (_, index) => new Intl.DateTimeFormat('vi-VN', { month: 'long' }).format(new Date(2024, index, 1)));

type PanelMode = 'date' | 'month' | 'year';
type DatePart = 'from' | 'to';
type DateRange = [string, string];

type Preset = {
    key: string;
    label: string;
    getRange: (today: Date) => DateRange;
};

const presets: Preset[] = [
    {
        key: 'today',
        label: 'Hôm nay',
        getRange: (today) => {
            const value = toDateValue(today);

            return [value, value];
        },
    },
    {
        key: 'yesterday',
        label: 'Hôm qua',
        getRange: (today) => {
            const value = toDateValue(addDays(today, -1));

            return [value, value];
        },
    },
    {
        key: 'last-7-days',
        label: '7 ngày qua',
        getRange: (today) => [toDateValue(addDays(today, -6)), toDateValue(today)],
    },
    {
        key: 'last-30-days',
        label: '30 ngày qua',
        getRange: (today) => [toDateValue(addDays(today, -29)), toDateValue(today)],
    },
    {
        key: 'this-month',
        label: 'Tháng này',
        getRange: (today) => [toDateValue(startOfMonth(today)), toDateValue(endOfMonth(today))],
    },
    {
        key: 'last-month',
        label: 'Tháng trước',
        getRange: (today) => {
            const month = addMonths(startOfMonth(today), -1);

            return [toDateValue(month), toDateValue(endOfMonth(month))];
        },
    },
    {
        key: 'this-year',
        label: 'Năm nay',
        getRange: (today) => [toDateValue(startOfYear(today)), toDateValue(endOfYear(today))],
    },
];

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

function todayDate(): Date {
    const today = new Date();

    return new Date(today.getFullYear(), today.getMonth(), today.getDate());
}

function startOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function startOfYear(date: Date): Date {
    return new Date(date.getFullYear(), 0, 1);
}

function endOfYear(date: Date): Date {
    return new Date(date.getFullYear(), 11, 31);
}

function addDays(date: Date, amount: number): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount);
}

function addMonths(date: Date, amount: number): Date {
    return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function addMonthsPreservingDay(date: Date, amount: number): Date {
    const nextMonth = addMonths(date, amount);
    const day = Math.min(date.getDate(), endOfMonth(nextMonth).getDate());

    return new Date(nextMonth.getFullYear(), nextMonth.getMonth(), day);
}

function formatDate(value: string | null): string {
    if (!value) return 'Chọn ngày';

    const date = parseDate(value);

    return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
}

function formatMonth(date: Date): string {
    return new Intl.DateTimeFormat('vi-VN', { month: 'long', year: 'numeric' }).format(date);
}

function getInitialDate(from: string | null, to: string | null): Date {
    return from ? parseDate(from) : to ? parseDate(to) : todayDate();
}

function isWithinBounds(value: string, min?: string, max?: string): boolean {
    return !(min && value < min) && !(max && value > max);
}

function isMonthAllowed(month: Date, min?: string, max?: string): boolean {
    return isWithinBounds(toDateValue(startOfMonth(month)), undefined, max) && isWithinBounds(toDateValue(endOfMonth(month)), min, undefined);
}

function isYearAllowed(year: number, min?: string, max?: string): boolean {
    return (
        isWithinBounds(toDateValue(startOfYear(new Date(year, 0, 1))), undefined, max) &&
        isWithinBounds(toDateValue(endOfYear(new Date(year, 0, 1))), min, undefined)
    );
}

function isYearGridAllowed(year: number, min?: string, max?: string): boolean {
    const firstYear = Math.floor(year / 10) * 10 - 1;

    return Array.from({ length: 12 }, (_, index) => isYearAllowed(firstYear + index, min, max)).some(Boolean);
}

function clampRange(range: DateRange, min?: string, max?: string): DateRange | null {
    const [rangeFrom, rangeTo] = range;

    if (max && rangeFrom > max) return null;
    if (min && rangeTo < min) return null;

    return [min && rangeFrom < min ? min : rangeFrom, max && rangeTo > max ? max : rangeTo];
}

function getDateButtonId(value: string): string {
    return `date-range-day-${value}`;
}

function getDateRangeBoundsError(from: string | null, to: string | null, min?: string, max?: string): string | undefined {
    if ((from && !isWithinBounds(from, min, max)) || (to && !isWithinBounds(to, min, max))) {
        return 'Ngày đã chọn nằm ngoài khoảng cho phép.';
    }

    return undefined;
}

function getInitialFocusDate(from: string | null, to: string | null, today: Date): string {
    return from ?? to ?? toDateValue(today);
}

function getKeyboardDate(value: string, event: KeyboardEvent<HTMLButtonElement>): Date | null {
    const date = parseDate(value);
    const withShift = event.shiftKey;

    switch (event.key) {
        case 'ArrowLeft':
            return addDays(date, -1);
        case 'ArrowRight':
            return addDays(date, 1);
        case 'ArrowUp':
            return addDays(date, -7);
        case 'ArrowDown':
            return addDays(date, 7);
        case 'Home':
            return addDays(date, -((date.getDay() + 6) % 7));
        case 'End':
            return addDays(date, 6 - ((date.getDay() + 6) % 7));
        case 'PageUp':
            return withShift ? addMonthsPreservingDay(date, -12) : addMonthsPreservingDay(date, -1);
        case 'PageDown':
            return withShift ? addMonthsPreservingDay(date, 12) : addMonthsPreservingDay(date, 1);
        default:
            return null;
    }
}

function MonthCalendar({
    month,
    from,
    to,
    preview,
    min,
    max,
    focusedDate,
    onSelect,
    onPreview,
    onKeyDown,
}: {
    month: Date;
    from: string | null;
    to: string | null;
    preview: string | null;
    min?: string;
    max?: string;
    focusedDate: string | null;
    onSelect: (value: string) => void;
    onPreview: (value: string | null) => void;
    onKeyDown: (event: KeyboardEvent<HTMLButtonElement>, value: string) => void;
}) {
    const year = month.getFullYear();
    const monthIndex = month.getMonth();
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const leadingDays = (new Date(year, monthIndex, 1).getDay() + 6) % 7;
    const monthLabel = formatMonth(month);
    const previewFrom = from && !to && preview && preview < from ? preview : from;
    const previewTo = from && !to && preview && preview < from ? from : preview;

    return (
        <section className="w-full min-w-70 sm:w-70" aria-label={monthLabel}>
            <h3 className="sr-only">{monthLabel}</h3>
            <div className="text-muted-foreground grid grid-cols-7 text-center text-xs font-medium" aria-hidden="true">
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
                    const isDisabled = !isWithinBounds(value, min, max);
                    const isStart = value === from;
                    const isEnd = value === to;
                    const isInRange = Boolean(from && to && value > from && value < to);
                    const isPreviewRange = Boolean(previewFrom && previewTo && value > previewFrom && value < previewTo);
                    const isToday = value === toDateValue(todayDate());
                    const isFocused = value === focusedDate;

                    return (
                        <button
                            key={value}
                            id={getDateButtonId(value)}
                            type="button"
                            role="gridcell"
                            tabIndex={isFocused ? 0 : -1}
                            disabled={isDisabled}
                            aria-label={new Intl.DateTimeFormat('vi-VN', { dateStyle: 'full' }).format(parseDate(value))}
                            aria-selected={isStart || isEnd || isInRange || isPreviewRange}
                            aria-current={isToday ? 'date' : undefined}
                            onClick={() => onSelect(value)}
                            onMouseEnter={() => onPreview(value)}
                            onMouseLeave={() => onPreview(null)}
                            onKeyDown={(event) => onKeyDown(event, value)}
                            className={cn(
                                'focus-visible:ring-ring relative flex size-10 items-center justify-center text-sm tabular-nums transition-colors focus-visible:z-10 focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-30',
                                (isInRange || isPreviewRange) && 'bg-primary/10 text-foreground',
                                isStart && (to || preview) && 'rounded-l-md',
                                isEnd && (from || preview) && 'rounded-r-md',
                                (isStart || isEnd) && 'bg-primary text-primary-foreground hover:bg-primary/90',
                                !isStart && !isEnd && !isInRange && !isPreviewRange && 'hover:bg-accent hover:text-accent-foreground rounded-md',
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

function MonthGrid({ year, min, max, onSelect }: { year: number; min?: string; max?: string; onSelect: (month: number) => void }) {
    return (
        <div className="grid grid-cols-3 gap-2" role="grid" aria-label={`Chọn tháng ${year}`}>
            {monthNames.map((label, month) => {
                const isDisabled = !isMonthAllowed(new Date(year, month, 1), min, max);

                return (
                    <button
                        key={label}
                        type="button"
                        role="gridcell"
                        disabled={isDisabled}
                        onClick={() => onSelect(month)}
                        className="focus-visible:ring-ring hover:bg-accent hover:text-accent-foreground min-h-10 rounded-md px-2 text-sm capitalize transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40"
                    >
                        {label}
                    </button>
                );
            })}
        </div>
    );
}

function YearGrid({ year, min, max, onSelect }: { year: number; min?: string; max?: string; onSelect: (year: number) => void }) {
    const firstYear = Math.floor(year / 10) * 10 - 1;

    return (
        <div className="grid grid-cols-3 gap-2" role="grid" aria-label="Chọn năm">
            {Array.from({ length: 12 }, (_, index) => firstYear + index).map((optionYear) => {
                const isDisabled = !isYearAllowed(optionYear, min, max);

                return (
                    <button
                        key={optionYear}
                        type="button"
                        role="gridcell"
                        disabled={isDisabled}
                        onClick={() => onSelect(optionYear)}
                        className="focus-visible:ring-ring hover:bg-accent hover:text-accent-foreground min-h-10 rounded-md px-2 text-sm tabular-nums transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40"
                    >
                        {optionYear}
                    </button>
                );
            })}
        </div>
    );
}

function DateRangePopoverPanel({
    open,
    close,
    from,
    to,
    min,
    max,
    onFromChange,
    onToChange,
}: {
    open: boolean;
    close: () => void;
    from: string | null;
    to: string | null;
    min?: string;
    max?: string;
    onFromChange: (value: string | null) => void;
    onToChange: (value: string | null) => void;
}) {
    const [draftFrom, setDraftFrom] = useState<string | null>(from);
    const [draftTo, setDraftTo] = useState<string | null>(to);
    const [activePart, setActivePart] = useState<DatePart>(from && !to ? 'to' : 'from');
    const [panelMode, setPanelMode] = useState<PanelMode>('date');
    const [referenceToday, setReferenceToday] = useState(todayDate);
    const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(getInitialDate(from, to)));
    const [focusedDate, setFocusedDate] = useState<string | null>(() => getInitialFocusDate(from, to, todayDate()));
    const [previewDate, setPreviewDate] = useState<string | null>(null);

    useEffect(() => {
        if (!open) return;

        const nextToday = todayDate();
        setDraftFrom(from);
        setDraftTo(to);
        setActivePart(from && !to ? 'to' : 'from');
        setPanelMode('date');
        setReferenceToday(nextToday);
        setVisibleMonth(startOfMonth(getInitialDate(from, to)));
        setFocusedDate(getInitialFocusDate(from, to, nextToday));
        setPreviewDate(null);
    }, [from, open, to]);

    const draftError = getDateRangeError(draftFrom, draftTo) ?? getDateRangeBoundsError(draftFrom, draftTo, min, max);
    const canApply = !draftError;
    const nextMonth = addMonths(visibleMonth, 1);
    const dateModeStep =
        panelMode === 'date'
            ? addMonths(visibleMonth, 1)
            : panelMode === 'month'
              ? new Date(visibleMonth.getFullYear() + 1, 0, 1)
              : new Date(visibleMonth.getFullYear() + 10, 0, 1);
    const previousModeStep =
        panelMode === 'date'
            ? addMonths(visibleMonth, -1)
            : panelMode === 'month'
              ? new Date(visibleMonth.getFullYear() - 1, 0, 1)
              : new Date(visibleMonth.getFullYear() - 10, 0, 1);
    const canGoPrevious =
        panelMode === 'year'
            ? isYearGridAllowed(previousModeStep.getFullYear(), min, max)
            : panelMode === 'month'
              ? isYearAllowed(previousModeStep.getFullYear(), min, max)
              : isMonthAllowed(previousModeStep, min, max);
    const canGoNext =
        panelMode === 'year'
            ? isYearGridAllowed(dateModeStep.getFullYear(), min, max)
            : panelMode === 'month'
              ? isYearAllowed(dateModeStep.getFullYear(), min, max)
              : isMonthAllowed(dateModeStep, min, max);
    const monthLabel = new Intl.DateTimeFormat('vi-VN', { month: 'long' }).format(visibleMonth);
    const yearLabel = String(visibleMonth.getFullYear());

    const focusDate = useCallback((value: string) => {
        setFocusedDate(value);
        setVisibleMonth(startOfMonth(parseDate(value)));
        window.setTimeout(() => document.getElementById(getDateButtonId(value))?.focus(), 0);
    }, []);

    const selectDate = (value: string) => {
        if (!isWithinBounds(value, min, max)) return;

        setPreviewDate(null);
        setFocusedDate(value);

        if (activePart === 'from') {
            if (draftTo && value > draftTo) {
                setDraftFrom(value);
                setDraftTo(null);
            } else {
                setDraftFrom(value);
            }
            setActivePart('to');

            return;
        }

        if (draftFrom && value < draftFrom) {
            setDraftFrom(value);
            setDraftTo(draftFrom);
        } else {
            setDraftTo(value);
        }
        setActivePart('from');
    };

    const handleDateKeyDown = (event: KeyboardEvent<HTMLButtonElement>, value: string) => {
        const nextDate = getKeyboardDate(value, event);
        if (!nextDate) return;

        const nextValue = toDateValue(nextDate);
        if (!isWithinBounds(nextValue, min, max)) return;

        event.preventDefault();
        focusDate(nextValue);
    };

    const handlePreset = (preset: Preset) => {
        const range = clampRange(preset.getRange(referenceToday), min, max);
        if (!range) return;

        onFromChange(range[0]);
        onToChange(range[1]);
        close();
    };

    const handleApply = () => {
        if (!canApply) return;

        onFromChange(draftFrom);
        onToChange(draftTo);
        close();
    };

    const clearDraft = () => {
        setDraftFrom(null);
        setDraftTo(null);
        setActivePart('from');
        setPreviewDate(null);
    };

    const clearPart = (part: DatePart) => {
        if (part === 'from') setDraftFrom(null);
        if (part === 'to') setDraftTo(null);
        setActivePart(part);
    };

    const chooseMonth = (month: number) => {
        setVisibleMonth(new Date(visibleMonth.getFullYear(), month, 1));
        setPanelMode('date');
        const focusValue = draftFrom ?? draftTo ?? toDateValue(new Date(visibleMonth.getFullYear(), month, 1));
        setFocusedDate(focusValue);
    };

    const chooseYear = (year: number) => {
        setVisibleMonth(new Date(year, visibleMonth.getMonth(), 1));
        setPanelMode('month');
    };

    const movePanel = (amount: number) => {
        if (panelMode === 'date') setVisibleMonth(addMonths(visibleMonth, amount));
        if (panelMode === 'month') setVisibleMonth(new Date(visibleMonth.getFullYear() + amount, 0, 1));
        if (panelMode === 'year') setVisibleMonth(new Date(visibleMonth.getFullYear() + amount * 10, 0, 1));
    };

    const goToToday = () => {
        const today = toDateValue(referenceToday);
        setVisibleMonth(startOfMonth(referenceToday));
        setPanelMode('date');
        if (isWithinBounds(today, min, max)) setFocusedDate(today);
    };

    const presetStates = useMemo(
        () => presets.map((preset) => ({ ...preset, range: clampRange(preset.getRange(referenceToday), min, max) })),
        [max, min, referenceToday],
    );

    return (
        <PopoverPanel
            transition
            className="bg-popover text-popover-foreground absolute top-full right-0 z-50 mt-2 w-[min(48rem,calc(100vw-1rem))] origin-top-right rounded-lg border p-3 shadow-lg transition duration-150 data-closed:-translate-y-1 data-closed:opacity-0 sm:right-auto sm:left-0 sm:p-4"
        >
            <div className="grid gap-4 sm:grid-cols-[9rem_minmax(0,1fr)]">
                <aside className="min-w-0 border-b pb-3 sm:border-r sm:border-b-0 sm:pr-4 sm:pb-0" aria-label="Khoảng nhanh">
                    <p className="text-muted-foreground mb-2 text-xs font-medium">Khoảng nhanh</p>
                    <div className="flex max-w-full gap-1 overflow-x-auto pb-1 sm:flex-col sm:overflow-visible sm:pb-0">
                        {presetStates.map((preset) => (
                            <button
                                key={preset.key}
                                type="button"
                                disabled={!preset.range}
                                onClick={() => handlePreset(preset)}
                                className="focus-visible:ring-ring hover:bg-accent hover:text-accent-foreground shrink-0 rounded-md px-2 py-1.5 text-left text-sm whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40 sm:w-full"
                            >
                                {preset.label}
                            </button>
                        ))}
                    </div>
                </aside>

                <div className="min-w-0">
                    <div className="flex items-center justify-between gap-2">
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            disabled={!canGoPrevious}
                            onClick={() => movePanel(-1)}
                            aria-label="Đi tới phần trước"
                        >
                            <ChevronLeft aria-hidden="true" />
                        </Button>
                        <div className="flex min-w-0 items-center justify-center gap-1">
                            <button
                                type="button"
                                onClick={() => setPanelMode(panelMode === 'month' ? 'date' : 'month')}
                                className="focus-visible:ring-ring hover:bg-accent rounded-md px-2 py-1 text-sm font-semibold capitalize focus-visible:ring-2 focus-visible:outline-none"
                                aria-label="Chọn tháng"
                            >
                                {monthLabel}
                            </button>
                            <button
                                type="button"
                                onClick={() => setPanelMode(panelMode === 'year' ? 'date' : 'year')}
                                className="focus-visible:ring-ring hover:bg-accent rounded-md px-2 py-1 text-sm font-semibold focus-visible:ring-2 focus-visible:outline-none"
                                aria-label="Chọn năm"
                            >
                                {yearLabel}
                            </button>
                            <ChevronDown className="text-muted-foreground size-3.5" aria-hidden="true" />
                        </div>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            disabled={!canGoNext}
                            onClick={() => movePanel(1)}
                            aria-label="Đi tới phần sau"
                        >
                            <ChevronRight aria-hidden="true" />
                        </Button>
                    </div>

                    <div className="text-muted-foreground mt-1 flex items-center justify-between gap-2 text-xs">
                        <p aria-live="polite">Đang chọn: {activePart === 'from' ? 'Từ ngày' : 'Đến ngày'}</p>
                        <button
                            type="button"
                            onClick={goToToday}
                            className="text-primary focus-visible:ring-ring rounded-sm px-1 font-medium hover:underline focus-visible:ring-2 focus-visible:outline-none"
                        >
                            Về hôm nay
                        </button>
                    </div>

                    <div className="mt-2">
                        {panelMode === 'date' ? (
                            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                                <MonthCalendar
                                    month={visibleMonth}
                                    from={draftFrom}
                                    to={draftTo}
                                    preview={previewDate}
                                    min={min}
                                    max={max}
                                    focusedDate={focusedDate}
                                    onSelect={selectDate}
                                    onPreview={setPreviewDate}
                                    onKeyDown={handleDateKeyDown}
                                />
                                <div className="border-t pt-4 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-4">
                                    <MonthCalendar
                                        month={nextMonth}
                                        from={draftFrom}
                                        to={draftTo}
                                        preview={previewDate}
                                        min={min}
                                        max={max}
                                        focusedDate={focusedDate}
                                        onSelect={selectDate}
                                        onPreview={setPreviewDate}
                                        onKeyDown={handleDateKeyDown}
                                    />
                                </div>
                            </div>
                        ) : panelMode === 'month' ? (
                            <MonthGrid year={visibleMonth.getFullYear()} min={min} max={max} onSelect={chooseMonth} />
                        ) : (
                            <YearGrid year={visibleMonth.getFullYear()} min={min} max={max} onSelect={chooseYear} />
                        )}
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2 border-t pt-3">
                        <div className="mr-auto flex min-w-0 items-center gap-1 text-xs tabular-nums">
                            <button
                                type="button"
                                onClick={() => setActivePart('from')}
                                className={cn(
                                    'focus-visible:ring-ring max-w-28 truncate rounded-sm px-1 py-0.5 focus-visible:ring-2 focus-visible:outline-none',
                                    activePart === 'from' && 'bg-accent text-accent-foreground font-medium',
                                )}
                            >
                                Từ: {formatDate(draftFrom)}
                            </button>
                            <ArrowRight className="text-muted-foreground size-3.5 shrink-0" aria-hidden="true" />
                            <button
                                type="button"
                                onClick={() => setActivePart('to')}
                                className={cn(
                                    'focus-visible:ring-ring max-w-28 truncate rounded-sm px-1 py-0.5 focus-visible:ring-2 focus-visible:outline-none',
                                    activePart === 'to' && 'bg-accent text-accent-foreground font-medium',
                                )}
                            >
                                Đến: {formatDate(draftTo)}
                            </button>
                        </div>
                        <div className="flex items-center gap-1">
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => clearPart(activePart)}
                                disabled={activePart === 'from' ? !draftFrom : !draftTo}
                            >
                                Xóa mốc
                            </Button>
                            <Button type="button" variant="ghost" size="sm" onClick={clearDraft} disabled={!draftFrom && !draftTo}>
                                Xóa
                            </Button>
                            <Button type="button" size="sm" variant="outline" onClick={close}>
                                Hủy
                            </Button>
                            <Button type="button" size="sm" onClick={handleApply} disabled={!canApply}>
                                <Check aria-hidden="true" />
                                Áp dụng
                            </Button>
                        </div>
                    </div>
                    {draftError ? (
                        <p className="text-destructive mt-2 text-xs" role="alert">
                            {draftError}
                        </p>
                    ) : null}
                </div>
            </div>
        </PopoverPanel>
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
    const triggerLabel = `Chọn khoảng ngày. Từ ngày: ${formatDate(from)}. Đến ngày: ${formatDate(to)}`;

    return (
        <fieldset className="flex min-w-0 flex-1 flex-col gap-1" disabled={disabled}>
            <legend className="sr-only">Khoảng ngày</legend>
            <Popover className="relative min-w-0">
                {({ close, open }) => (
                    <>
                        <div
                            className={cn(
                                'bg-background flex h-10 min-w-0 items-center rounded-md border p-0.5 text-left transition-colors',
                                rangeError ? 'border-destructive/70' : 'border-input',
                                disabled && 'cursor-not-allowed opacity-50',
                            )}
                        >
                            <PopoverButton
                                className="focus-visible:ring-ring flex min-w-0 flex-1 items-center gap-2 rounded-sm px-2 outline-none focus-visible:ring-2 focus-visible:ring-inset"
                                aria-label={triggerLabel}
                                aria-describedby={rangeError ? errorId : undefined}
                                aria-invalid={Boolean(rangeError)}
                            >
                                <CalendarDays className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
                                <span className="flex min-w-0 flex-1 items-center gap-1.5 text-xs">
                                    <span className="text-muted-foreground shrink-0 font-medium">Từ ngày</span>
                                    <span className={cn('min-w-0 truncate text-sm tabular-nums', !from && 'text-muted-foreground')}>
                                        {formatDate(from)}
                                    </span>
                                </span>
                                <ArrowRight className="text-muted-foreground size-3.5 shrink-0" aria-hidden="true" />
                                <span className="flex min-w-0 flex-1 items-center gap-1.5 text-xs">
                                    <span className="text-muted-foreground shrink-0 font-medium">Đến ngày</span>
                                    <span className={cn('min-w-0 truncate text-sm tabular-nums', !to && 'text-muted-foreground')}>
                                        {formatDate(to)}
                                    </span>
                                </span>
                            </PopoverButton>
                            {hasValue ? (
                                <button
                                    type="button"
                                    className="text-muted-foreground hover:text-foreground focus-visible:ring-ring flex size-8 shrink-0 items-center justify-center rounded-sm focus-visible:ring-2 focus-visible:outline-none"
                                    onClick={() => {
                                        onFromChange(null);
                                        onToChange(null);
                                    }}
                                    aria-label="Xóa khoảng ngày"
                                >
                                    <X className="size-4" aria-hidden="true" />
                                </button>
                            ) : (
                                <span className="size-8 shrink-0" aria-hidden="true" />
                            )}
                        </div>
                        {open ? (
                            <DateRangePopoverPanel
                                open={open}
                                close={close}
                                from={from}
                                to={to}
                                min={min}
                                max={max}
                                onFromChange={onFromChange}
                                onToChange={onToChange}
                            />
                        ) : null}
                    </>
                )}
            </Popover>
            <FieldError id={errorId} message={rangeError} />
        </fieldset>
    );
}
