import { FieldError, MoneyInput } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SearchableSelect } from '@/components/ui/searchable-select';
import type { InertiaFormProps } from '@inertiajs/react';
import { Plus, Trash2 } from 'lucide-react';
import { useMemo } from 'react';
import type { ProductUnit, StockReceiptFormData, StockReceiptRow } from '../model/types';

export function StockReceiptItemsTable({
    form,
    productUnits,
    updateRow,
    addRow,
    removeRow,
}: {
    form: InertiaFormProps<StockReceiptFormData>;
    productUnits: ProductUnit[];
    updateRow: (index: number, values: Partial<StockReceiptRow>) => void;
    addRow: () => void;
    removeRow: (index: number) => void;
}) {
    const fieldErrors = form.errors as Record<string, string | undefined>;

    return (
        <>
            <div className="overflow-x-auto">
                <table className="w-full min-w-[800px] text-sm">
                    <thead className="bg-muted text-muted-foreground text-left text-xs uppercase">
                        <tr>
                            <th className="p-2">Sản phẩm / quy cách</th>
                            <th className="p-2">Số lượng</th>
                            <th className="p-2">Giá nhập / ĐV</th>
                            <th className="p-2">Số lô</th>
                            <th className="p-2">Hạn sử dụng</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {form.data.items.map((row, index) => (
                            <tr key={index} className="border-t">
                                <td className="p-2">
                                    <ProductUnitPicker
                                        productUnits={productUnits}
                                        value={row.product_unit_id}
                                        onChange={(value) => updateRow(index, { product_unit_id: value })}
                                    />
                                </td>
                                <td className="p-2">
                                    <Input
                                        type="number"
                                        min="0.001"
                                        step="0.001"
                                        value={row.quantity}
                                        onChange={(event) => updateRow(index, { quantity: Number(event.target.value) })}
                                    />
                                </td>
                                <td className="p-2">
                                    <MoneyInput
                                        id={`stock-unit-cost-${index}`}
                                        min={0}
                                        required
                                        value={row.unit_cost}
                                        aria-label={`Giá nhập / đơn vị, dòng ${index + 1}`}
                                        invalid={Boolean(fieldErrors[`items.${index}.unit_cost`])}
                                        aria-describedby={fieldErrors[`items.${index}.unit_cost`] ? `stock-unit-cost-${index}-error` : undefined}
                                        onValueChange={(value) => updateRow(index, { unit_cost: value })}
                                    />
                                    <FieldError id={`stock-unit-cost-${index}-error`} message={fieldErrors[`items.${index}.unit_cost`]} />
                                </td>
                                <td className="p-2">
                                    <Input value={row.lot_number} onChange={(event) => updateRow(index, { lot_number: event.target.value })} />
                                </td>
                                <td className="p-2">
                                    <Input
                                        type="date"
                                        value={row.expiry_date}
                                        aria-label={`Hạn sử dụng, dòng ${index + 1}`}
                                        onChange={(event) => updateRow(index, { expiry_date: event.target.value })}
                                    />
                                </td>
                                <td>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        disabled={form.data.items.length === 1}
                                        onClick={() => removeRow(index)}
                                        aria-label={`Xóa dòng nhập kho ${index + 1}`}
                                    >
                                        <Trash2 className="size-4" />
                                    </Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="flex justify-between">
                <Button type="button" variant="outline" onClick={addRow}>
                    <Plus className="mr-2 size-4" />
                    Thêm dòng
                </Button>
                <Button type="submit" disabled={form.processing}>
                    Ghi nhận nhập kho
                </Button>
            </div>
        </>
    );
}

function ProductUnitPicker({ productUnits, value, onChange }: { productUnits: ProductUnit[]; value: number; onChange: (value: number) => void }) {
    const options = useMemo(
        () =>
            productUnits.map((item) => ({
                value: String(item.id),
                label: `${item.variant.product.name} · ${item.unit.name}`,
                searchText: `${item.variant.product.name} ${item.variant.product.sku} ${item.unit.code} ${item.unit.name} ${item.barcodes.map((barcode) => barcode.value).join(' ')}`,
            })),
        [productUnits],
    );
    const productUnitById = useMemo(() => new Map(productUnits.map((item) => [String(item.id), item])), [productUnits]);

    return (
        <SearchableSelect
            value={value ? String(value) : null}
            options={options}
            onValueChange={(selectedValue) => {
                if (selectedValue) onChange(Number(selectedValue));
            }}
            placeholder="Tìm tên, SKU, barcode…"
            searchPlaceholder="Tìm tên, SKU, barcode…"
            emptyText="Không tìm thấy đơn vị."
            maxVisibleOptions={40}
            aria-label="Sản phẩm / quy cách"
            optionContent={(option) => {
                const item = productUnitById.get(option.value);

                if (!item) return option.label;

                return (
                    <>
                        <span className="font-medium">
                            {item.variant.product.name} · {item.unit.name}
                        </span>
                        <span className="text-muted-foreground ml-1">
                            {item.variant.product.sku} / {item.unit.code}
                        </span>
                    </>
                );
            }}
        />
    );
}
