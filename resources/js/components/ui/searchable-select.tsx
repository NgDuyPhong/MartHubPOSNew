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
    const searchId = `${id}-search`;
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
        <Combobox value={selectedOption} onChange={handleChange} disabled={disabled} nullable by="value">
            {({ open }) => (
                <div className={cn('relative w-full', className)}>
                    <ComboboxButton
                        id={id}
                        type="button"
                        className={cn(
                            'group flex h-10 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 text-left text-sm shadow-xs transition-colors',
                            'hover:bg-accent/40 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
                            'disabled:cursor-not-allowed disabled:opacity-50',
                            hasError && 'border-destructive focus-visible:ring-destructive',
                        )}
                        aria-label={ariaLabel}
                        aria-describedby={describedBy}
                        aria-invalid={hasError || undefined}
                    >
                        <span className={cn('min-w-0 flex-1 truncate', !selectedOption && 'text-muted-foreground')}>
                            {selectedOption?.label ?? placeholder}
                        </span>
                        <ChevronDown
                            className={cn('text-muted-foreground size-4 shrink-0 transition-transform', open && 'rotate-180')}
                            aria-hidden="true"
                        />
                    </ComboboxButton>
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
                    <ComboboxOptions
                        modal={false}
                        className="absolute top-full left-0 z-50 mt-1 w-full min-w-64 overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-lg ring-1 ring-black/5 empty:invisible"
                    >
                        <div className="border-b p-2">
                            <div className="relative">
                                <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" aria-hidden="true" />
                                <ComboboxInput
                                    id={searchId}
                                    value={query}
                                    autoFocus
                                    autoComplete="off"
                                    className={cn(
                                        'h-9 w-full rounded-md border border-input bg-background pr-9 pl-9 text-sm outline-hidden',
                                        'placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/30',
                                        inputClassName,
                                    )}
                                    onChange={(event) => setQuery(event.currentTarget.value)}
                                    placeholder={searchPlaceholder}
                                    aria-label={ariaLabel ? `${ariaLabel} - tìm kiếm` : searchPlaceholder}
                                />
                                {query && !loading && (
                                    <button
                                        type="button"
                                        className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2 rounded-sm p-1 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                                        onMouseDown={(event) => event.preventDefault()}
                                        onClick={() => setQuery('')}
                                        aria-label="Xóa từ khóa tìm kiếm"
                                    >
                                        <X className="size-3.5" aria-hidden="true" />
                                    </button>
                                )}
                                {loading && <LoaderCircle className="text-muted-foreground absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin" aria-hidden="true" />}
                            </div>
                        </div>
                        <div className="max-h-64 overscroll-contain overflow-y-auto p-1 touch-pan-y">
                            {loading ? (
                                <div className="text-muted-foreground flex items-center justify-center gap-2 px-3 py-5 text-sm" role="status">
                                    <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                                    {loadingText}
                                </div>
                            ) : filteredOptions.length > 0 ? (
                                filteredOptions.map((option) => (
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
