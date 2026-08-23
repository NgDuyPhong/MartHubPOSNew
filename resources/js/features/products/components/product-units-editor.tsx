import { FieldError, MoneyInput } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { cn } from '@/lib/utils';
import type { InertiaFormProps } from '@inertiajs/react';
import { Plus, Trash2 } from 'lucide-react';
import type { ProductFormData, Unit, UnitRow } from '../model/types';

export function ProductUnitsEditor({
    form,
    units,
    firstUnit,
    updateUnit,
    chooseExclusive,
}: {
    form: InertiaFormProps<ProductFormData>;
    units: Unit[];
    firstUnit: number;
    updateUnit: (index: number, values: Partial<UnitRow>) => void;
    chooseExclusive: (index: number, field: 'is_base' | 'is_default_sale') => void;
}) {
    const nextUnitId = units.find((unit) => !form.data.units.some((row) => row.unit_id === unit.id))?.id ?? null;
    const fieldErrors = form.errors as Record<string, string | undefined>;
    const addUnit = () => {
        if (nextUnitId === null) return;

        form.setData('units', [
            ...form.data.units,
            {
                unit_id: nextUnitId ?? firstUnit,
                conversion_to_base: 1,
                sale_price: 0,
                barcode: '',
                is_base: false,
                is_default_sale: false,
                allows_fractional_quantity: false,
            },
        ]);
    };
    const removeUnit = (index: number) =>
        form.setData(
            'units',
            form.data.units.filter((_, rowIndex) => rowIndex !== index),
        );

    return (
        <div>
            <div className="mb-2 flex items-center justify-between">
                <Label>Quy cách / đơn vị bán</Label>
                <Button type="button" size="sm" variant="outline" onClick={addUnit} disabled={nextUnitId === null}>
                    <Plus className="mr-1 size-3" />
                    Thêm đơn vị
                </Button>
            </div>
            <div className="flex flex-col gap-2">
                {form.data.units
                    .map((row, index) => ({ row, index }))
                    .sort(({ row: first }, { row: second }) => Number(second.is_default_sale) - Number(first.is_default_sale))
                    .map(({ row, index }) => {
                        const unitError = fieldErrors[`units.${index}.unit_id`];

                        return (
                            <div
                                key={row.id ?? index}
                                className={cn(
                                    'product-unit-row flex flex-col gap-3 rounded-md border p-3',
                                    row.is_default_sale ? 'border-primary/50 bg-primary/5 shadow-sm' : 'bg-muted/30',
                                )}
                            >
                                <div className="grid items-end gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_120px_150px]">
                                    <div>
                                        <Label htmlFor={`product-unit-barcode-${index}`}>Barcode</Label>
                                        <Input
                                            id={`product-unit-barcode-${index}`}
                                            className="h-9"
                                            value={row.barcode}
                                            onChange={(event) => updateUnit(index, { barcode: event.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor={`product-unit-${index}`}>Đơn vị</Label>
                                        <SearchableSelect
                                            id={`product-unit-${index}`}
                                            value={String(row.unit_id)}
                                            options={units
                                                .filter(
                                                    (unit) =>
                                                        unit.id === row.unit_id ||
                                                        !form.data.units.some(
                                                            (otherRow, otherIndex) => otherIndex !== index && otherRow.unit_id === unit.id,
                                                        ),
                                                )
                                                .map((unit) => ({
                                                    value: String(unit.id),
                                                    label: `${unit.name} (${unit.code})`,
                                                    searchText: `${unit.name} ${unit.code}`,
                                                }))}
                                            onValueChange={(value) => {
                                                if (value) updateUnit(index, { unit_id: Number(value) });
                                            }}
                                            placeholder="Chọn đơn vị…"
                                            searchPlaceholder="Tìm tên hoặc mã đơn vị…"
                                            emptyText="Không tìm thấy đơn vị."
                                            inputClassName="h-9 pr-12 pl-9 text-sm"
                                            invalid={Boolean(unitError)}
                                            aria-describedby={unitError ? `product-unit-${index}-error` : undefined}
                                        />
                                        <FieldError id={`product-unit-${index}-error`} message={unitError} />
                                    </div>
                                    <div>
                                        <Label htmlFor={`product-unit-price-${index}`}>Giá bán</Label>
                                        <MoneyInput
                                            id={`product-unit-price-${index}`}
                                            className="h-9"
                                            value={row.sale_price}
                                            min={0}
                                            syncKey={`${row.id ?? 'new'}-${row.unit_id}`}
                                            onValueChange={(value) => updateUnit(index, { sale_price: value })}
                                            aria-describedby={
                                                fieldErrors[`units.${index}.sale_price`] ? `product-unit-price-${index}-error` : undefined
                                            }
                                            invalid={Boolean(fieldErrors[`units.${index}.sale_price`])}
                                        />
                                        <FieldError id={`product-unit-price-${index}-error`} message={fieldErrors[`units.${index}.sale_price`]} />
                                    </div>
                                    <div>
                                        <Label htmlFor={`product-unit-conversion-${index}`}>Hệ số</Label>
                                        <Input
                                            id={`product-unit-conversion-${index}`}
                                            className="h-9"
                                            type="number"
                                            min="0.000001"
                                            step="0.000001"
                                            disabled={row.is_base}
                                            value={row.conversion_to_base}
                                            onChange={(event) => updateUnit(index, { conversion_to_base: Number(event.target.value) })}
                                        />
                                    </div>
                                </div>
                                <div className="flex flex-wrap items-center justify-end gap-3 border-t pt-3">
                                    <label
                                        className={cn(
                                            'flex items-center gap-2 rounded-md px-2 py-1 text-xs font-medium',
                                            row.is_default_sale ? 'bg-primary/15 text-primary' : 'text-muted-foreground',
                                        )}
                                    >
                                        <input
                                            type="radio"
                                            name="default"
                                            checked={row.is_default_sale}
                                            onChange={() => chooseExclusive(index, 'is_default_sale')}
                                        />{' '}
                                        Bán mặc định
                                    </label>
                                    <label className="flex items-center gap-2 text-xs">
                                        <input type="radio" name="base" checked={row.is_base} onChange={() => chooseExclusive(index, 'is_base')} /> ĐV
                                        gốc
                                    </label>
                                    <div className="flex items-center gap-2 text-xs">
                                        <Checkbox
                                            id={`product-unit-fractional-${index}`}
                                            checked={row.allows_fractional_quantity}
                                            onCheckedChange={(checked) => updateUnit(index, { allows_fractional_quantity: checked === true })}
                                        />
                                        <Label htmlFor={`product-unit-fractional-${index}`}>Cho phép lẻ</Label>
                                    </div>
                                    <Button
                                        type="button"
                                        size="icon"
                                        variant="ghost"
                                        disabled={form.data.units.length === 1}
                                        onClick={() => removeUnit(index)}
                                        aria-label="Xóa đơn vị"
                                    >
                                        <Trash2 className="size-4" />
                                    </Button>
                                </div>
                            </div>
                        );
                    })}
            </div>
            <FieldError message={form.errors.units} />
        </div>
    );
}
