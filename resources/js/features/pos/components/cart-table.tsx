import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatMoney } from '@/lib/format';
import { AlertTriangle, Minus, Plus, ShoppingCart, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { CartReconciliation } from '../model/selectors';
import type { CartLine } from '../model/types';

export function CartTable({
    cart,
    reconciliation,
    selectedKey,
    online,
    onSelect,
    onClear,
    onUpdate,
    onRemove,
}: {
    cart: CartLine[];
    reconciliation: CartReconciliation;
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
                    <p className="text-muted-foreground text-xs">{cart.length} dòng sản phẩm</p>
                </div>
                <Button variant="ghost" size="sm" disabled={!cart.length} onClick={onClear}>
                    <Trash2 className="mr-1 size-4" />
                    Xóa giỏ
                </Button>
            </div>
            <div className="min-h-0 flex-1 overflow-auto">
                <table className="w-full min-w-[680px] text-sm" aria-label="Các dòng hàng trong hóa đơn hiện tại">
                    <thead className="bg-muted text-muted-foreground sticky top-0 text-left text-xs uppercase">
                        <tr>
                            <th scope="col" className="px-3 py-2">
                                Sản phẩm
                            </th>
                            <th scope="col" className="w-28 px-2 py-2">
                                SL
                            </th>
                            <th scope="col" className="w-32 px-2 py-2">
                                Đơn giá
                            </th>
                            <th scope="col" className="w-28 px-2 py-2">
                                Giảm
                            </th>
                            <th scope="col" className="w-28 px-3 py-2 text-right">
                                Thành tiền
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {cart.map((line) => (
                            <tr
                                key={line.key}
                                onClick={() => onSelect(line.key)}
                                tabIndex={0}
                                aria-selected={selectedKey === line.key}
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter' || event.key === ' ') {
                                        event.preventDefault();
                                        onSelect(line.key);
                                    }
                                }}
                                className={`focus-visible:ring-ring border-t focus-visible:ring-2 ${selectedKey === line.key ? 'bg-accent' : ''} ${
                                    reconciliation[line.key]?.status === 'unavailable' ? 'bg-destructive/5' : ''
                                }`}
                            >
                                <td className="px-3 py-2">
                                    <div className="font-medium">{line.product.name}</div>
                                    <div className="text-muted-foreground text-xs">
                                        {line.productUnit.unit.name} · 1 {line.productUnit.unit.code} = {Number(line.productUnit.conversion_to_base)}{' '}
                                        đơn vị gốc
                                    </div>
                                    {reconciliation[line.key]?.status === 'unavailable' && (
                                        <div className="text-destructive mt-1 flex items-center gap-1 text-xs" role="status">
                                            <AlertTriangle className="size-3.5 shrink-0" aria-hidden="true" />
                                            Không còn bán. Xóa dòng và chọn sản phẩm khác.
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="text-destructive h-auto px-1 py-0 text-xs"
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    onRemove(line.key);
                                                }}
                                            >
                                                Xóa dòng
                                            </Button>
                                        </div>
                                    )}
                                    {reconciliation[line.key]?.status === 'price_changed' && (
                                        <div className="text-warning mt-1 flex items-center gap-1 text-xs" role="status">
                                            <AlertTriangle className="size-3.5 shrink-0" aria-hidden="true" />
                                            Giá catalog đã đổi; giá trong giỏ vẫn được giữ nguyên.
                                        </div>
                                    )}
                                </td>
                                <td className="px-2 py-2">
                                    <QuantityInput line={line} onUpdate={onUpdate} onRemove={onRemove} />
                                </td>
                                <td className="px-2">
                                    <Input
                                        className="h-8 px-2 text-right"
                                        type="number"
                                        value={line.unitPrice}
                                        aria-label={`Đơn giá ${line.product.name}`}
                                        disabled={!online}
                                        onChange={(event) => onUpdate(line.key, { unitPrice: Math.max(0, Number(event.target.value)) })}
                                    />
                                </td>
                                <td className="px-2">
                                    <Input
                                        className="h-8 px-2 text-right"
                                        type="number"
                                        value={line.discount}
                                        aria-label={`Giảm giá ${line.product.name}`}
                                        disabled={!online}
                                        onChange={(event) => onUpdate(line.key, { discount: Math.max(0, Number(event.target.value)) })}
                                    />
                                </td>
                                <td className="px-3 text-right font-semibold">{formatMoney(line.unitPrice * line.quantity - line.discount)}đ</td>
                            </tr>
                        ))}
                        {!cart.length && (
                            <tr>
                                <td colSpan={5} className="text-muted-foreground py-20 text-center">
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

function QuantityInput({
    line,
    onUpdate,
    onRemove,
}: {
    line: CartLine;
    onUpdate: (key: string, values: Partial<CartLine>) => void;
    onRemove: (key: string) => void;
}) {
    const [draft, setDraft] = useState(String(line.quantity));
    const [error, setError] = useState<string | null>(null);
    const allowsFractional = line.productUnit.allows_fractional_quantity;

    useEffect(() => setDraft(String(line.quantity)), [line.quantity]);

    const commit = () => {
        if (draft.trim() === '') {
            setDraft(String(line.quantity));
            setError(null);
            return;
        }
        const quantity = Number(draft);
        if (!Number.isFinite(quantity) || quantity <= 0) {
            setError('Số lượng phải lớn hơn 0.');
            return;
        }
        if (!allowsFractional && !Number.isInteger(quantity)) {
            setError('Đơn vị đóng gói chỉ nhận số nguyên.');
            return;
        }
        setError(null);
        onUpdate(line.key, { quantity });
    };

    return (
        <div>
            <div className="flex items-center">
                <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="size-7"
                    aria-label={`Giảm số lượng ${line.product.name}`}
                    onClick={() => (line.quantity <= 1 ? onRemove(line.key) : onUpdate(line.key, { quantity: line.quantity - 1 }))}
                >
                    <Minus className="size-3" />
                </Button>
                <Input
                    className="h-7 w-14 rounded-none px-1 text-center"
                    type="number"
                    min={allowsFractional ? '0.001' : '1'}
                    step={allowsFractional ? '0.001' : '1'}
                    value={draft}
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? `${line.key}-quantity-error` : undefined}
                    onChange={(event) => {
                        setDraft(event.target.value);
                        setError(null);
                    }}
                    onBlur={commit}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                            event.preventDefault();
                            commit();
                        }
                    }}
                />
                <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="size-7"
                    aria-label={`Tăng số lượng ${line.product.name}`}
                    onClick={() => onUpdate(line.key, { quantity: line.quantity + 1 })}
                >
                    <Plus className="size-3" />
                </Button>
            </div>
            {error && (
                <p id={`${line.key}-quantity-error`} className="text-destructive mt-1 text-[11px] leading-tight">
                    {error}
                </p>
            )}
        </div>
    );
}
