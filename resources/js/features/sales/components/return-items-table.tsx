import { Input } from '@/components/ui/input';
import type { InertiaFormProps } from '@inertiajs/react';
import { remainingReturnQuantity, updateReturnItem } from '../model/selectors';
import type { ReturnFormData, SaleItem } from '../model/types';

export function ReturnItemsTable({ saleItems, form }: { saleItems: SaleItem[]; form: InertiaFormProps<ReturnFormData> }) {
    return (
        <div className="max-h-72 overflow-y-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="bg-muted/40 text-left">
                        <th className="p-2">Sản phẩm</th>
                        <th className="p-2">Có thể trả</th>
                        <th className="p-2">Số trả</th>
                        <th className="p-2">Tình trạng</th>
                    </tr>
                </thead>
                <tbody>
                    {saleItems.map((item, index) => {
                        const remaining = remainingReturnQuantity(item);
                        return (
                            <tr key={item.id} className="border-t">
                                <td className="p-2 font-medium">
                                    {item.product_name} · {item.unit_name}
                                </td>
                                <td className="p-2">{remaining}</td>
                                <td className="p-2">
                                    <Input
                                        aria-label={`Số lượng trả ${item.product_name}`}
                                        type="number"
                                        min="0"
                                        max={remaining}
                                        step="0.001"
                                        value={form.data.items[index].quantity}
                                        onChange={(event) =>
                                            form.setData('items', updateReturnItem(form.data.items, index, { quantity: Number(event.target.value) }))
                                        }
                                    />
                                </td>
                                <td className="p-2">
                                    <select
                                        aria-label={`Tình trạng ${item.product_name}`}
                                        className="bg-background h-9 rounded-md border px-2"
                                        value={form.data.items[index].condition}
                                        onChange={(event) =>
                                            form.setData('items', updateReturnItem(form.data.items, index, { condition: event.target.value }))
                                        }
                                    >
                                        <option value="resellable">Còn bán được</option>
                                        <option value="damaged">Hỏng / hủy</option>
                                    </select>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
