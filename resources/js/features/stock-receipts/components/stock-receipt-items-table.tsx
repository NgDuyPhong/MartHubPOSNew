import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { InertiaFormProps } from '@inertiajs/react';
import { Plus, Trash2 } from 'lucide-react';
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
    return (
        <>
            <div className="overflow-x-auto">
                <table className="w-full min-w-[800px] text-sm">
                    <thead className="bg-slate-50 text-left text-xs text-slate-500 uppercase">
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
                                    <select
                                        className="h-9 w-full rounded-md border bg-white px-2"
                                        value={row.product_unit_id}
                                        onChange={(event) => updateRow(index, { product_unit_id: Number(event.target.value) })}
                                    >
                                        {productUnits.map((item) => (
                                            <option key={item.id} value={item.id}>
                                                {item.variant.product.name} · {item.unit.name} ({item.unit.code})
                                            </option>
                                        ))}
                                    </select>
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
                                    <Input
                                        type="number"
                                        min="0"
                                        value={row.unit_cost}
                                        onChange={(event) => updateRow(index, { unit_cost: Number(event.target.value) })}
                                    />
                                </td>
                                <td className="p-2">
                                    <Input value={row.lot_number} onChange={(event) => updateRow(index, { lot_number: event.target.value })} />
                                </td>
                                <td className="p-2">
                                    <Input
                                        type="date"
                                        value={row.expiry_date}
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
