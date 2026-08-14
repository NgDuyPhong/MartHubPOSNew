import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useForm } from '@inertiajs/react';
import { useEffect, type FormEvent } from 'react';

type QuickEditProduct = {
    id: number;
    name: string;
    sku: string;
    category_id: number | null;
    updated_at?: string;
    variants: Array<{
        units: Array<{ id: number; sale_price: number; is_default_sale: boolean; unit: { name: string } }>;
    }>;
};

type QuickEditData = {
    name: string;
    category_id: number | '';
    product_unit_id: number;
    sale_price: number;
    updated_at: string;
};

export function ProductQuickEditSheet({
    product,
    unitId,
    categories,
    open,
    onOpenChange,
    online = true,
}: {
    product: QuickEditProduct | null;
    unitId?: number;
    categories: Array<{ id: number; name: string }>;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    online?: boolean;
}) {
    const variant = product?.variants[0];
    const unit = variant?.units.find((item) => item.id === unitId) ?? variant?.units.find((item) => item.is_default_sale) ?? variant?.units[0];
    const form = useForm<QuickEditData>({
        name: product?.name ?? '',
        category_id: product?.category_id ?? '',
        product_unit_id: unit?.id ?? 0,
        sale_price: unit?.sale_price ?? 0,
        updated_at: product?.updated_at ?? '',
    });
    const { setData, clearErrors } = form;

    useEffect(() => {
        setData({
            name: product?.name ?? '',
            category_id: product?.category_id ?? '',
            product_unit_id: unit?.id ?? 0,
            sale_price: unit?.sale_price ?? 0,
            updated_at: product?.updated_at ?? '',
        });
        clearErrors();
    }, [clearErrors, product?.category_id, product?.id, product?.name, product?.updated_at, setData, unit?.id, unit?.sale_price]);

    const submit = (event: FormEvent) => {
        event.preventDefault();
        if (!product) return;
        if (!online) return;

        form.patch(route('products.quick-update', product.id), {
            preserveScroll: true,
            onSuccess: () => {
                onOpenChange(false);
                form.reset();
            },
        });
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
                <SheetHeader>
                    <SheetTitle>Sửa nhanh sản phẩm</SheetTitle>
                    <SheetDescription>Thay đổi tên, danh mục hoặc giá của đơn vị đang chọn. Dữ liệu hóa đơn cũ không thay đổi.</SheetDescription>
                </SheetHeader>
                <form onSubmit={submit} className="flex flex-col gap-5 px-6 py-4">
                    {!online && <p className="border-amber-300 bg-amber-50 text-amber-900 rounded-md border p-3 text-sm">Cần kết nối mạng để sửa dữ liệu sản phẩm.</p>}
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="quick-product-name">Tên sản phẩm</Label>
                        <Input id="quick-product-name" disabled={!online} value={form.data.name} onChange={(event) => form.setData('name', event.target.value)} required />
                        {form.errors.name && <p className="text-destructive text-xs">{form.errors.name}</p>}
                    </div>
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="quick-product-category">Danh mục</Label>
                        <select
                            id="quick-product-category"
                            className="bg-background h-10 rounded-md border px-3 text-sm"
                            value={form.data.category_id}
                            disabled={!online}
                            onChange={(event) => form.setData('category_id', event.target.value ? Number(event.target.value) : '')}
                        >
                            <option value="">Không phân loại</option>
                            {categories.map((category) => (
                                <option key={category.id} value={category.id}>
                                    {category.name}
                                </option>
                            ))}
                        </select>
                        {form.errors.category_id && <p className="text-destructive text-xs">{form.errors.category_id}</p>}
                    </div>
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="quick-product-price">Giá bán · {unit?.unit.name ?? 'đơn vị'}</Label>
                        <Input
                            id="quick-product-price"
                            type="number"
                            min="0"
                            value={form.data.sale_price}
                            disabled={!online}
                            onChange={(event) => form.setData('sale_price', Math.max(0, Number(event.target.value)))}
                            required
                        />
                        {form.errors.sale_price && <p className="text-destructive text-xs">{form.errors.sale_price}</p>}
                    </div>
                    <p className="text-muted-foreground rounded-md border bg-muted/40 p-3 text-xs">
                        Sản phẩm đang được sửa: <strong>{product?.sku}</strong>. Giá của dòng hàng đã có trong giỏ sẽ được giữ nguyên.
                    </p>
                    <SheetFooter className="px-0">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Hủy
                        </Button>
                        <Button type="submit" disabled={form.processing || !product || !online}>
                            {form.processing ? 'Đang lưu…' : 'Lưu thay đổi'}
                        </Button>
                    </SheetFooter>
                </form>
            </SheetContent>
        </Sheet>
    );
}
