import { FieldError, FormErrorSummary, MoneyInput } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useFocusReturn } from '@/hooks/use-focus-return';
import { Link, useForm } from '@inertiajs/react';
import { ExternalLink } from 'lucide-react';
import { useEffect, type FormEvent } from 'react';

type QuickEditProduct = {
    id: number;
    name: string;
    sku: string;
    category_id: number | null;
    category?: { name: string };
    updated_at?: string;
    variants: Array<{
        units: Array<{ id: number; sale_price: number; is_default_sale: boolean; unit: { name: string } }>;
    }>;
};

type QuickEditData = {
    name: string;
    category_id: number | '';
    product_unit_id: number;
    sale_price: number | '';
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
    const { captureFocus, restoreFocus } = useFocusReturn(open);
    const handleOpenChange = (nextOpen: boolean) => {
        if (!nextOpen) restoreFocus();
        onOpenChange(nextOpen);
    };
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
                handleOpenChange(false);
                form.reset();
            },
        });
    };

    return (
        <Sheet open={open} onOpenChange={handleOpenChange}>
            <SheetContent
                className="w-full overflow-y-auto sm:max-w-lg"
                onOpenAutoFocus={() => captureFocus()}
                onCloseAutoFocus={(event) => {
                    event.preventDefault();
                    restoreFocus();
                }}
            >
                <SheetHeader>
                    <SheetTitle>Sửa nhanh sản phẩm</SheetTitle>
                    <SheetDescription>
                        <span>Thay đổi tên, danh mục hoặc giá của đơn vị đang chọn. Dữ liệu hóa đơn cũ không thay đổi.</span>
                        {product && (
                            <span className="text-foreground mt-2 block font-medium">
                                {product.name} · SKU {product.sku} · Đơn vị {unit?.unit.name ?? 'chưa xác định'}
                            </span>
                        )}
                    </SheetDescription>
                </SheetHeader>
                <form onSubmit={submit} className="flex flex-col gap-5 px-6 py-4">
                    <FormErrorSummary errors={form.errors} />
                    {!online && (
                        <p className="border-warning/40 bg-warning-muted text-warning-muted-foreground rounded-md border p-3 text-sm">
                            Cần kết nối mạng để sửa dữ liệu sản phẩm.
                        </p>
                    )}
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="quick-product-name">Tên sản phẩm</Label>
                        <Input
                            id="quick-product-name"
                            disabled={!online}
                            value={form.data.name}
                            onChange={(event) => form.setData('name', event.target.value)}
                            aria-invalid={form.errors.name ? true : undefined}
                            aria-describedby={form.errors.name ? 'quick-product-name-error' : undefined}
                            required
                        />
                        <FieldError id="quick-product-name-error" message={form.errors.name} />
                    </div>
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="quick-product-price">Giá bán · {unit?.unit.name ?? 'đơn vị'}</Label>
                        <MoneyInput
                            id="quick-product-price"
                            min={0}
                            value={form.data.sale_price}
                            disabled={!online}
                            syncKey={`${product?.id ?? 'none'}-${unit?.id ?? 'none'}`}
                            onValueChange={(value) => form.setData('sale_price', value)}
                            invalid={Boolean(form.errors.sale_price)}
                            aria-describedby={form.errors.sale_price ? 'quick-product-price-error' : undefined}
                            required
                        />
                        <FieldError id="quick-product-price-error" message={form.errors.sale_price} />
                    </div>
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="quick-product-category">Danh mục</Label>
                        <SearchableSelect
                            id="quick-product-category"
                            value={form.data.category_id === '' ? null : String(form.data.category_id)}
                            options={categories.map((category) => ({ value: String(category.id), label: category.name, searchText: category.name }))}
                            onValueChange={(value) => form.setData('category_id', value ? Number(value) : '')}
                            placeholder="Không phân loại"
                            searchPlaceholder="Tìm danh mục…"
                            emptyText="Không tìm thấy danh mục."
                            selectedOption={
                                product?.category && product.category_id !== null
                                    ? { value: String(product.category_id), label: product.category.name, searchText: product.category.name }
                                    : null
                            }
                            inputClassName="text-sm"
                            disabled={!online}
                            invalid={Boolean(form.errors.category_id)}
                            aria-describedby={form.errors.category_id ? 'quick-product-category-error' : undefined}
                            clearable
                        />
                        <FieldError id="quick-product-category-error" message={form.errors.category_id} />
                    </div>
                    <p className="text-muted-foreground bg-muted/40 rounded-md border p-3 text-xs">
                        Sản phẩm đang được sửa: <strong>{product?.sku}</strong>. Giá của dòng hàng đã có trong giỏ sẽ được giữ nguyên.
                    </p>
                    <SheetFooter className="px-0">
                        <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                            Hủy
                        </Button>
                        {product && online ? (
                            <Button asChild variant="secondary">
                                <Link href={route('products.edit', product.id)}>
                                    <ExternalLink />
                                    Mở trang sửa
                                </Link>
                            </Button>
                        ) : (
                            <Button type="button" variant="secondary" disabled>
                                <ExternalLink />
                                Mở trang sửa
                            </Button>
                        )}
                        <Button type="submit" disabled={form.processing || !product || !online}>
                            {form.processing ? 'Đang lưu…' : 'Lưu thay đổi'}
                        </Button>
                    </SheetFooter>
                </form>
            </SheetContent>
        </Sheet>
    );
}
