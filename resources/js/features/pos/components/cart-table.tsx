import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatMoney } from '@/lib/format';
import { Minus, Plus, ShoppingCart, Trash2 } from 'lucide-react';
import type { CartLine } from '../model/types';

export function CartTable({
    cart,
    selectedKey,
    online,
    onSelect,
    onClear,
    onUpdate,
    onRemove,
}: {
    cart: CartLine[];
    selectedKey: string | null;
    online: boolean;
    onSelect: (key: string) => void;
    onClear: () => void;
    onUpdate: (key: string, values: Partial<CartLine>) => void;
    onRemove: (key: string) => void;
}) {
    return (
        <>
            <div className="flex items-center justify-between border-b px-4 py-3">
                <div>
                    <h2 className="font-semibold">Hóa đơn hiện tại</h2>
                    <p className="text-xs text-slate-500">{cart.length} dòng sản phẩm</p>
                </div>
                <Button variant="ghost" size="sm" disabled={!cart.length} onClick={onClear}>
                    <Trash2 className="mr-1 size-4" />
                    Xóa giỏ
                </Button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
                <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-slate-50 text-left text-xs text-slate-500 uppercase">
                        <tr>
                            <th className="px-3 py-2">Sản phẩm</th>
                            <th className="w-28 px-2 py-2">SL</th>
                            <th className="w-32 px-2 py-2">Đơn giá</th>
                            <th className="w-28 px-2 py-2">Giảm</th>
                            <th className="w-28 px-3 py-2 text-right">Thành tiền</th>
                        </tr>
                    </thead>
                    <tbody>
                        {cart.map((line) => (
                            <tr
                                key={line.key}
                                onClick={() => onSelect(line.key)}
                                className={`border-t ${selectedKey === line.key ? 'bg-blue-50' : ''}`}
                            >
                                <td className="px-3 py-2">
                                    <div className="font-medium">{line.product.name}</div>
                                    <div className="text-xs text-slate-500">
                                        {line.productUnit.unit.name} · 1 {line.productUnit.unit.code} = {Number(line.productUnit.conversion_to_base)}{' '}
                                        đơn vị gốc
                                    </div>
                                </td>
                                <td className="px-2 py-2">
                                    <div className="flex items-center">
                                        <Button
                                            size="icon"
                                            variant="outline"
                                            className="size-7"
                                            onClick={() =>
                                                line.quantity <= 1 ? onRemove(line.key) : onUpdate(line.key, { quantity: line.quantity - 1 })
                                            }
                                        >
                                            <Minus className="size-3" />
                                        </Button>
                                        <Input
                                            className="h-7 w-12 rounded-none px-1 text-center"
                                            type="number"
                                            min="0.001"
                                            value={line.quantity}
                                            onChange={(event) => onUpdate(line.key, { quantity: Math.max(0.001, Number(event.target.value)) })}
                                        />
                                        <Button
                                            size="icon"
                                            variant="outline"
                                            className="size-7"
                                            onClick={() => onUpdate(line.key, { quantity: line.quantity + 1 })}
                                        >
                                            <Plus className="size-3" />
                                        </Button>
                                    </div>
                                </td>
                                <td className="px-2">
                                    <Input
                                        className="h-8 px-2 text-right"
                                        type="number"
                                        value={line.unitPrice}
                                        disabled={!online}
                                        onChange={(event) => onUpdate(line.key, { unitPrice: Math.max(0, Number(event.target.value)) })}
                                    />
                                </td>
                                <td className="px-2">
                                    <Input
                                        className="h-8 px-2 text-right"
                                        type="number"
                                        value={line.discount}
                                        disabled={!online}
                                        onChange={(event) => onUpdate(line.key, { discount: Math.max(0, Number(event.target.value)) })}
                                    />
                                </td>
                                <td className="px-3 text-right font-semibold">{formatMoney(line.unitPrice * line.quantity - line.discount)}đ</td>
                            </tr>
                        ))}
                        {!cart.length && (
                            <tr>
                                <td colSpan={5} className="py-20 text-center text-slate-400">
                                    <ShoppingCart className="mx-auto mb-2 size-10" />
                                    Quét mã hoặc chọn sản phẩm để bắt đầu
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </>
    );
}
