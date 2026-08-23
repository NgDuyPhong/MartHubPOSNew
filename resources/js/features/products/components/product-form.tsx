import { FieldError, FormErrorSummary } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import type { InertiaFormProps } from '@inertiajs/react';
import type { Product, ProductFormData, Unit, UnitRow } from '../model/types';
import { generateProductSku, hasValidBaseUnit, normalizeUnitRows } from '../model/validation';
import { ProductImageField } from './product-image-field';
import { ProductUnitsEditor } from './product-units-editor';

export function ProductForm({
    form,
    categories,
    units,
    product,
    onCancel,
}: {
    form: InertiaFormProps<ProductFormData>;
    categories: Array<{ id: number; name: string }>;
    units: Unit[];
    product?: Product;
    onCancel: () => void;
}) {
    const selectedCategory =
        product?.category && product.category_id !== null
            ? { value: String(product.category_id), label: product.category.name, searchText: product.category.name }
            : null;
    const updateUnit = (index: number, values: Partial<UnitRow>) =>
        form.setData(
            'units',
            form.data.units.map((row, rowIndex) => (rowIndex === index ? { ...row, ...values } : row)),
        );
    const chooseExclusive = (index: number, field: 'is_base' | 'is_default_sale') =>
        form.setData(
            'units',
            form.data.units.map((row, rowIndex) => ({
                ...row,
                [field]: rowIndex === index,
                ...(field === 'is_base' && rowIndex === index ? { conversion_to_base: 1 } : {}),
            })),
        );
    const submit = (event: React.FormEvent) => {
        event.preventDefault();
        if (!hasValidBaseUnit(form.data.units)) {
            form.setError('units', 'Cần có đúng một đơn vị cơ sở với hệ số bằng 1.');
            return;
        }
        form.transform((data) => ({ ...data, units: normalizeUnitRows(data.units), ...(product ? { _method: 'put' } : {}) }));
        form.post(product ? route('products.update', product.id) : route('products.store'), { forceFormData: true, onSuccess: onCancel });
    };

    return (
        <form onSubmit={submit} className="flex flex-col gap-6 pb-24">
            <FormErrorSummary errors={form.errors} />
            <section className="bg-card flex flex-col gap-4 rounded-lg border p-4 md:p-6">
                <div>
                    <h2 className="text-lg font-semibold">Thông tin cơ bản</h2>
                    <p className="text-muted-foreground mt-1 text-sm">Tên, SKU và trạng thái hiển thị trong catalog.</p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="product-name">Tên sản phẩm</Label>
                        <Input
                            id="product-name"
                            value={form.data.name}
                            onChange={(event) => form.setData('name', event.target.value)}
                            aria-invalid={form.errors.name ? true : undefined}
                            aria-describedby={form.errors.name ? 'product-name-error' : undefined}
                            required
                        />
                        <FieldError id="product-name-error" message={form.errors.name} />
                    </div>
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="product-sku">SKU</Label>
                        <div className="flex gap-2">
                            <Input
                                id="product-sku"
                                value={form.data.sku}
                                onChange={(event) => form.setData('sku', event.target.value)}
                                aria-invalid={form.errors.sku ? true : undefined}
                                aria-describedby={form.errors.sku ? 'product-sku-error' : undefined}
                                required
                            />
                            {!product && (
                                <Button type="button" variant="outline" onClick={() => form.setData('sku', generateProductSku())}>
                                    Tạo lại
                                </Button>
                            )}
                        </div>
                        {!product && <p className="text-muted-foreground text-xs">SKU được tạo sẵn; bạn vẫn có thể chỉnh sửa.</p>}
                        <FieldError id="product-sku-error" message={form.errors.sku} />
                    </div>
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="product-category">Danh mục</Label>
                        <SearchableSelect
                            id="product-category"
                            value={form.data.category_id === '' ? null : String(form.data.category_id)}
                            options={categories.map((category) => ({ value: String(category.id), label: category.name, searchText: category.name }))}
                            onValueChange={(value) => form.setData('category_id', value ? Number(value) : '')}
                            placeholder="Không phân loại"
                            searchPlaceholder="Tìm danh mục…"
                            emptyText="Không tìm thấy danh mục."
                            selectedOption={selectedCategory}
                            invalid={Boolean(form.errors.category_id)}
                            aria-describedby={form.errors.category_id ? 'product-category-error' : undefined}
                            clearable
                        />
                        <FieldError id="product-category-error" message={form.errors.category_id} />
                    </div>
                </div>
            </section>
            <section className="bg-card rounded-lg border p-4 md:p-6">
                <ProductUnitsEditor
                    form={form}
                    units={units}
                    firstUnit={units[0]?.id ?? 0}
                    updateUnit={updateUnit}
                    chooseExclusive={chooseExclusive}
                />
            </section>
            <section className="bg-card rounded-lg border p-4 md:p-6">
                <ProductImageField form={form} currentUrl={product?.image_url} productName={form.data.name} />
            </section>
            <section className="bg-card flex flex-col gap-3 rounded-lg border p-4 md:p-6">
                <div>
                    <h2 className="text-lg font-semibold">Theo dõi kho và trạng thái</h2>
                    <p className="text-muted-foreground mt-1 text-sm">Thiết lập cách quản lý lô, hạn sử dụng và khả năng bán sản phẩm.</p>
                </div>
                <div className="flex flex-wrap gap-4">
                    <div className="flex min-h-10 items-center gap-2 text-sm">
                        <Checkbox
                            id="product-track-lot"
                            checked={form.data.track_lot}
                            onCheckedChange={(checked) => form.setData('track_lot', checked === true)}
                        />
                        <Label htmlFor="product-track-lot">Theo dõi lô</Label>
                    </div>
                    <div className="flex min-h-10 items-center gap-2 text-sm">
                        <Checkbox
                            id="product-track-expiry"
                            checked={form.data.track_expiry}
                            onCheckedChange={(checked) => form.setData('track_expiry', checked === true)}
                        />
                        <Label htmlFor="product-track-expiry">Theo dõi hạn sử dụng</Label>
                    </div>
                    <div className="flex min-h-10 items-center gap-2 text-sm">
                        <Checkbox
                            id="product-is-active"
                            checked={form.data.is_active}
                            onCheckedChange={(checked) => form.setData('is_active', checked === true)}
                        />
                        <Label htmlFor="product-is-active">Đang bán</Label>
                    </div>
                </div>
                <FieldError message={form.errors.is_active} />
            </section>
            <div className="bg-background/95 fixed right-0 bottom-0 left-0 z-20 flex justify-end gap-2 border-t p-3 backdrop-blur md:pr-6">
                <Button type="button" variant="outline" onClick={onCancel}>
                    Hủy
                </Button>
                <Button type="submit" disabled={form.processing}>
                    {form.processing ? 'Đang lưu…' : product ? 'Cập nhật sản phẩm' : 'Lưu sản phẩm'}
                </Button>
            </div>
        </form>
    );
}
