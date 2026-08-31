import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatMoney, formatQuantity } from '@/lib/format';
import { Check } from 'lucide-react';
import type { Product, ProductUnit, Variant } from '../model/types';

export function VariantUnitPicker({
    product,
    open,
    onOpenChange,
    onSelect,
    mode = 'add',
    selectedUnitId,
}: {
    product: Product | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSelect: (product: Product, variant: Variant, unit: ProductUnit) => void;
    mode?: 'add' | 'replace';
    selectedUnitId?: number;
}) {
    const isReplaceMode = mode === 'replace';

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-xl">
                <DialogHeader>
                    <DialogTitle>{isReplaceMode ? 'Đổi quy cách bán' : 'Chọn quy cách bán'}</DialogTitle>
                    <DialogDescription>
                        {product
                            ? isReplaceMode
                                ? `Chọn quy cách mới của ${product.name} cho dòng hiện tại.`
                                : `${product.name} có nhiều variant hoặc đơn vị. Chọn đúng dòng trước khi thêm vào hóa đơn.`
                            : ''}
                    </DialogDescription>
                </DialogHeader>
                <div className="flex max-h-[60vh] flex-col gap-3 overflow-y-auto">
                    {product?.variants.map((variant) => (
                        <section key={variant.id} className="flex flex-col gap-2 rounded-md border p-3">
                            <h3 className="font-medium">{variant.name}</h3>
                            <div className="grid gap-2 sm:grid-cols-2">
                                {variant.units.map((unit) =>
                                    (() => {
                                        const isSelected = selectedUnitId === unit.id;
                                        const baseQuantity = Number(variant.balances[0]?.quantity_base ?? 0);
                                        const conversion = Number(unit.conversion_to_base);
                                        const convertedQuantity = conversion > 0 ? baseQuantity / conversion : 0;
                                        const sellableQuantity = unit.allows_fractional_quantity ? convertedQuantity : Math.floor(convertedQuantity);

                                        return (
                                            <Button
                                                key={unit.id}
                                                type="button"
                                                variant="outline"
                                                className={`h-auto justify-between gap-3 px-3 py-2 text-left ${isSelected ? 'border-primary bg-accent' : ''}`}
                                                aria-pressed={isSelected}
                                                disabled={isSelected}
                                                onClick={() => onSelect(product, variant, unit)}
                                            >
                                                <span>
                                                    <span className="block font-medium">{unit.unit.name}</span>
                                                    <span className="text-primary flex items-center gap-1">
                                                        {isSelected && <Check className="size-4" aria-hidden="true" />}
                                                        {formatMoney(unit.sale_price)}đ
                                                    </span>
                                                </span>
                                                <span className="text-muted-foreground block text-xs">
                                                    Tồn: {formatQuantity(sellableQuantity)} {unit.unit.code}
                                                </span>
                                            </Button>
                                        );
                                    })(),
                                )}
                            </div>
                        </section>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    );
}
