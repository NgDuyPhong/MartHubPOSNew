import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
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
            <div className="space-y-2">
                {form.data.units.map((row, index) => {
                    const unitError = fieldErrors[`units.${index}.unit_id`];

                    return (
                        <div
                            key={index}
                            className="bg-muted/30 grid items-end gap-2 rounded-md border p-3 md:grid-cols-[1fr_120px_150px_1fr_auto_auto_auto_auto]"
                        >
                            <div>
                                <Label htmlFor={`product-unit-${index}`}>Đơn vị</Label>
                                <SearchableSelect
                                    id={`product-unit-${index}`}
                                    value={String(row.unit_id)}
                                    options={units
                                        .filter(
                                            (unit) =>
                                                unit.id === row.unit_id ||
                                                !form.data.units.some((otherRow, otherIndex) => otherIndex !== index && otherRow.unit_id === unit.id),
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
                                {unitError && (
                                    <p id={`product-unit-${index}-error`} className="text-destructive mt-1 text-xs">
                                        {unitError}
                                    </p>
                                )}
                            </div>
                            <div>
                                <Label>Hệ số</Label>
                                <Input
                                    className="h-9"
                                    type="number"
                                    min="0.000001"
                                    step="0.000001"
                                    disabled={row.is_base}
                                    value={row.conversion_to_base}
                                    onChange={(event) => updateUnit(index, { conversion_to_base: Number(event.target.value) })}
                                />
                            </div>
                            <div>
                                <Label>Giá bán</Label>
                                <Input
                                    className="h-9"
                                    type="number"
                                    min="0"
                                    value={row.sale_price}
                                    onChange={(event) => updateUnit(index, { sale_price: Number(event.target.value) })}
                                />
                            </div>
                            <div>
                                <Label>Barcode</Label>
                                <Input className="h-9" value={row.barcode} onChange={(event) => updateUnit(index, { barcode: event.target.value })} />
                            </div>
                            <label className="pb-2 text-xs">
                                <input type="radio" name="base" checked={row.is_base} onChange={() => chooseExclusive(index, 'is_base')} /> ĐV gốc
                            </label>
                            <label className="flex items-center gap-1 pb-2 text-xs">
                                <input
                                    type="checkbox"
                                    checked={row.allows_fractional_quantity}
                                    onChange={(event) => updateUnit(index, { allows_fractional_quantity: event.target.checked })}
                                />
                                Cho phép lẻ
                            </label>
                            <label className="pb-2 text-xs">
                                <input
                                    type="radio"
                                    name="default"
                                    checked={row.is_default_sale}
                                    onChange={() => chooseExclusive(index, 'is_default_sale')}
                                />{' '}
                                Bán mặc định
                            </label>
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
                    );
                })}
            </div>
            {form.errors.units && <p className="text-destructive mt-1 text-xs">{form.errors.units}</p>}
        </div>
    );
}
