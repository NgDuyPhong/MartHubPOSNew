import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatMoney, formatQuantity } from '@/lib/format';
import type { Product, ProductUnit, Variant } from '../model/types';

export function VariantUnitPicker({
    product,
    open,
    onOpenChange,
    onSelect,
}: {
    product: Product | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSelect: (product: Product, variant: Variant, unit: ProductUnit) => void;
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>Chọn quy cách bán</DialogTitle>
                    <DialogDescription>
                        {product ? `${product.name} có nhiều variant hoặc đơn vị. Chọn đúng dòng trước khi thêm vào hóa đơn.` : ''}
                    </DialogDescription>
                </DialogHeader>
                <div className="flex max-h-[60vh] flex-col gap-3 overflow-y-auto">
                    {product?.variants.map((variant) => (
                        <section key={variant.id} className="flex flex-col gap-2 rounded-md border p-3">
                            <h3 className="font-medium">{variant.name}</h3>
                            <div className="grid gap-2 sm:grid-cols-2">
                                {variant.units.map((unit) => (
                                    <Button
                                        key={unit.id}
                                        type="button"
                                        variant="outline"
                                        className="h-auto justify-between gap-3 px-3 py-2 text-left"
                                        onClick={() => onSelect(product, variant, unit)}
                                    >
                                        <span>
                                            <span className="block font-medium">{unit.unit.name}</span>
                                            <span className="text-muted-foreground block text-xs">
                                                Tồn {formatQuantity(Number(variant.balances[0]?.quantity_base ?? 0))}
                                            </span>
                                        </span>
                                        <span className="text-primary">{formatMoney(unit.sale_price)}đ</span>
                                    </Button>
                                ))}
                            </div>
                        </section>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    );
}
