import { Combobox, ComboboxButton, ComboboxInput, ComboboxOption, ComboboxOptions } from '@headlessui/react';
import { Check, ChevronDown, LoaderCircle, Search, SearchX, X } from 'lucide-react';
import { useEffect, useId, useMemo, useState, type ReactNode } from 'react';

import { cn } from '@/lib/utils';
import { vietnameseIncludes } from '@/lib/vietnamese-search';

export type SearchableOption = {
    value: string;
    label: string;
    searchText?: string;
    disabled?: boolean;
};

export type SearchableSelectProps = {
    id?: string;
    value: string | null;
    options: SearchableOption[];
    onValueChange: (value: string | null) => void;
    placeholder?: string;
    searchPlaceholder?: string;
    searchDebounceMs?: number;
    maxVisibleOptions?: number;
    emptyText?: string;
    loadingText?: string;
    disabled?: boolean;
    loading?: boolean;
    error?: string | null;
    clearable?: boolean;
    invalid?: boolean;
    selectedOption?: SearchableOption | null;
    className?: string;
    inputClassName?: string;
    'aria-label'?: string;
    'aria-describedby'?: string;
    optionContent?: (option: SearchableOption) => ReactNode;
};

export function SearchableSelect({
    id: idProp,
    value,
    options,
    onValueChange,
    placeholder = 'Chọn một tùy chọn…',
    searchPlaceholder = 'Tìm kiếm…',
    searchDebounceMs = 150,
    maxVisibleOptions,
    emptyText = 'Không tìm thấy kết quả.',
    loadingText = 'Đang tải…',
    disabled = false,
    loading = false,
    error = null,
    clearable = false,
    invalid = false,
    selectedOption: selectedOptionProp = null,
    className,
    inputClassName,
    'aria-label': ariaLabel,
    'aria-describedby': ariaDescribedBy,
    optionContent,
}: SearchableSelectProps) {
    const generatedId = useId();
    const id = idProp ?? generatedId;
    const [query, setQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState(query);
    const [lastSelectedOption, setLastSelectedOption] = useState<SearchableOption | null>(null);
    const optionFromOptions = options.find((option) => option.value === value) ?? null;
    const selectedOptionFromProp = selectedOptionProp?.value === value ? selectedOptionProp : null;
    const selectedOption =
        optionFromOptions ?? selectedOptionFromProp ?? (lastSelectedOption?.value === value ? lastSelectedOption : null);
    const errorId = `${id}-error`;
    const hasError = invalid || Boolean(error);
    const describedBy = [ariaDescribedBy, error ? errorId : null].filter(Boolean).join(' ') || undefined;

    useEffect(() => {
        if (value === null) {
            if (lastSelectedOption !== null) setLastSelectedOption(null);
            return;
        }

        const nextSelectedOption = optionFromOptions ?? selectedOptionFromProp;
        if (
            nextSelectedOption &&
            (lastSelectedOption?.value !== nextSelectedOption.value ||
                lastSelectedOption.label !== nextSelectedOption.label ||
                lastSelectedOption.searchText !== nextSelectedOption.searchText ||
                lastSelectedOption.disabled !== nextSelectedOption.disabled)
        ) {
            setLastSelectedOption(nextSelectedOption);
        }
    }, [lastSelectedOption, optionFromOptions, selectedOptionFromProp, value]);

    useEffect(() => {
        const timeout = window.setTimeout(() => setDebouncedQuery(query), Math.max(0, searchDebounceMs));

        return () => window.clearTimeout(timeout);
    }, [query, searchDebounceMs]);

    const filteredOptions = useMemo(() => {
        if (!debouncedQuery.trim()) return options;

        return options.filter((option) => vietnameseIncludes(`${option.label} ${option.searchText ?? ''}`, debouncedQuery));
    }, [debouncedQuery, options]);
    const visibleOptions =
        maxVisibleOptions === undefined ? filteredOptions : filteredOptions.slice(0, Math.max(0, maxVisibleOptions));

    const handleChange = (option: SearchableOption | null) => {
        setLastSelectedOption(option);
        onValueChange(option?.value ?? null);
        setQuery('');
    };

    const clearSelection = (event: React.MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        event.stopPropagation();
        setLastSelectedOption(null);
        onValueChange(null);
        setQuery('');
    };

    return (
        <Combobox value={selectedOption} onChange={handleChange} onClose={() => setQuery('')} disabled={disabled} nullable by="value">
            {({ open }) => (
                <div className={cn('relative w-full', className)}>
                    <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 z-10 size-4 -translate-y-1/2" aria-hidden="true" />
                    <ComboboxInput
                        id={id}
                        displayValue={(option: SearchableOption | null) => option?.label ?? ''}
                        autoComplete="off"
                        className={cn(
                            'h-10 w-full rounded-md border border-input bg-background pr-20 pl-9 text-sm shadow-xs outline-hidden transition-colors',
                            'placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/30',
                            hasError && 'border-destructive focus:border-destructive focus:ring-destructive/30',
                            inputClassName,
                        )}
                        onChange={(event) => setQuery(event.currentTarget.value)}
                        onFocus={(event) => {
                            if (selectedOption && !query) event.currentTarget.select();
                        }}
                        placeholder={placeholder}
                        aria-label={ariaLabel ?? searchPlaceholder}
                        aria-describedby={describedBy}
                        aria-invalid={hasError || undefined}
                    />
                    {query && !loading && (
                        <button
                            type="button"
                            className="text-muted-foreground hover:text-foreground absolute top-1/2 right-11 z-10 -translate-y-1/2 rounded-sm p-1 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => setQuery('')}
                            aria-label="Xóa từ khóa tìm kiếm"
                        >
                            <X className="size-3.5" aria-hidden="true" />
                        </button>
                    )}
                    {clearable && selectedOption && !disabled && (
                        <button
                            type="button"
                            className="text-muted-foreground hover:text-foreground absolute top-1/2 right-8 z-10 -translate-y-1/2 rounded-sm p-1 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                            onClick={clearSelection}
                            aria-label="Xóa lựa chọn"
                        >
                            <X className="size-4" aria-hidden="true" />
                        </button>
                    )}
                    <ComboboxButton
                        type="button"
                        className="text-muted-foreground hover:text-foreground absolute inset-y-0 right-0 z-10 flex w-9 items-center justify-center rounded-r-md focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                        aria-label={ariaLabel ? `Mở ${ariaLabel}` : 'Mở danh sách lựa chọn'}
                    >
                        <ChevronDown className={cn('size-4 transition-transform', open && 'rotate-180')} aria-hidden="true" />
                    </ComboboxButton>
                    <ComboboxOptions
                        anchor="bottom start"
                        portal
                        modal={false}
                        className="z-50 max-w-[calc(100vw-1rem)] min-w-64 overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-lg ring-1 ring-black/5 empty:invisible [--anchor-gap:0.25rem] [--anchor-padding:0.5rem] w-[var(--input-width)]"
                    >
                        {loading && <LoaderCircle className="text-muted-foreground absolute top-3 right-3 size-4 animate-spin" aria-hidden="true" />}
                        <div className="max-h-64 overscroll-contain overflow-y-auto p-1 touch-pan-y">
                            {loading ? (
                                <div className="text-muted-foreground flex items-center justify-center gap-2 px-3 py-5 text-sm" role="status">
                                    <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                                    {loadingText}
                                </div>
                            ) : visibleOptions.length > 0 ? (
                                visibleOptions.map((option) => (
                                    <ComboboxOption
                                        key={option.value}
                                        value={option}
                                        disabled={option.disabled}
                                        className="data-focus:bg-accent data-focus:text-accent-foreground relative flex min-h-10 cursor-default select-none items-center gap-2 rounded-md px-3 py-2 text-sm outline-hidden data-disabled:pointer-events-none data-disabled:opacity-50"
                                    >
                                        {({ selected }) => (
                                            <>
                                                <span className="flex size-4 shrink-0 items-center justify-center">
                                                    <Check className={cn('size-4', selected ? 'opacity-100' : 'opacity-0')} aria-hidden="true" />
                                                </span>
                                                <span className="min-w-0 flex-1 truncate">{optionContent ? optionContent(option) : option.label}</span>
                                            </>
                                        )}
                                    </ComboboxOption>
                                ))
                            ) : (
                                <div className="text-muted-foreground flex flex-col items-center justify-center gap-2 px-3 py-6 text-center text-sm" role="status">
                                    <SearchX className="size-5" aria-hidden="true" />
                                    <span>{emptyText}</span>
                                </div>
                            )}
                        </div>
                    </ComboboxOptions>
                    {error && (
                        <p id={errorId} className="text-destructive mt-1 text-xs" role="alert">
                            {error}
                        </p>
                    )}
                </div>
            )}
        </Combobox>
    );
}
