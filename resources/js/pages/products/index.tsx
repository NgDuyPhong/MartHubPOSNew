import { CollectionState, Pagination, SearchField } from '@/components/shared';
import { Button } from '@/components/ui/button';
import {
    ProductFormDialog,
    ProductTable,
    hasValidBaseUnit,
    normalizeUnitRows,
    type Product,
    type ProductFormData,
    type Unit,
    type UnitRow,
} from '@/features/products';
import { useListQuery } from '@/hooks/use-list-query';
import AppLayout from '@/layouts/app-layout';
import type { Paginated } from '@/types/pagination';
import { Head, useForm } from '@inertiajs/react';
import { Plus } from 'lucide-react';
import { FormEvent, useState } from 'react';

type ProductFilters = {
    search: string;
    category_id: number | null;
    status: string;
    sort: string;
    direction: string;
    per_page: number;
    page: number;
};

export default function ProductsPage({
    products,
    categories,
    units,
    filters,
    canManageCatalog,
}: {
    products: Paginated<Product>;
    categories: Array<{ id: number; name: string }>;
    units: Unit[];
    filters: Omit<ProductFilters, 'page'>;
    canManageCatalog: boolean;
}) {
    const [open, setOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const firstUnit = units[0]?.id ?? 0;
    const initialData = (): ProductFormData => ({
        name: '',
        sku: '',
        category_id: '',
        image: null,
        track_lot: false,
        track_expiry: false,
        is_active: true,
        units: [
            {
                unit_id: firstUnit,
                conversion_to_base: 1,
                sale_price: 0,
                barcode: '',
                is_base: true,
                is_default_sale: true,
                allows_fractional_quantity: false,
            },
        ],
    });
    const form = useForm<ProductFormData>(initialData());
    const { query, update, reset } = useListQuery<ProductFilters>(route('products.index'), { ...filters, page: 1 });
    const submit = (event: FormEvent) => {
        event.preventDefault();
        if (!hasValidBaseUnit(form.data.units)) {
            form.setError('units', 'Cần có đúng một đơn vị cơ sở với hệ số bằng 1.');
            return;
        }
        const options = {
            forceFormData: true,
            onSuccess: () => {
                setOpen(false);
                setEditingId(null);
                form.reset();
            },
        };
        if (editingId) {
            form.transform((data) => ({ ...data, units: normalizeUnitRows(data.units), _method: 'put' }));
            form.post(route('products.update', editingId), options);
        } else {
            form.transform((data) => ({ ...data, units: normalizeUnitRows(data.units) }));
            form.post(route('products.store'), options);
        }
    };
    const addProduct = () => {
        setEditingId(null);
        form.setData(initialData());
        setOpen(true);
    };
    const editProduct = (product: Product) => {
        const variant = product.variants[0];
        setEditingId(product.id);
        form.setData({
            name: product.name,
            sku: product.sku,
            category_id: product.category_id ?? '',
            image: null,
            track_lot: product.track_lot,
            track_expiry: product.track_expiry,
            is_active: product.is_active,
            units: (variant?.units ?? []).map((row) => ({
                id: row.id,
                unit_id: row.unit.id,
                conversion_to_base: Number(row.conversion_to_base),
                sale_price: row.sale_price,
                barcode: row.barcodes[0]?.value ?? '',
                is_base: row.is_base,
                is_default_sale: row.is_default_sale,
                allows_fractional_quantity: row.allows_fractional_quantity,
            })),
        });
        setOpen(true);
    };
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

    return (
        <AppLayout breadcrumbs={[{ title: 'Sản phẩm', href: route('products.index') }]}>
            <Head title="Sản phẩm" />
            <div className="space-y-4 p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold">Sản phẩm & đơn vị bán</h1>
                        <p className="text-muted-foreground text-sm">Tồn kho luôn lưu theo đơn vị cơ sở; barcode gắn với từng quy cách.</p>
                    </div>
                    {canManageCatalog && (
                        <Button onClick={addProduct}>
                            <Plus className="mr-2 size-4" />
                            Thêm sản phẩm
                        </Button>
                    )}
                </div>
                <div className="bg-card flex flex-col gap-3 rounded-lg border p-3 shadow-sm md:flex-row md:items-center">
                    <SearchField value={query.search} onChange={(value) => update('search', value)} placeholder="Tìm tên, SKU hoặc barcode…" />
                    <select
                        className="bg-background h-10 rounded-md border px-3 text-sm"
                        value={query.category_id ?? ''}
                        onChange={(event) => update('category_id', event.target.value ? Number(event.target.value) : null)}
                        aria-label="Lọc theo danh mục"
                    >
                        <option value="">Tất cả danh mục</option>
                        {categories.map((category) => (
                            <option key={category.id} value={category.id}>
                                {category.name}
                            </option>
                        ))}
                    </select>
                    <select
                        className="bg-background h-10 rounded-md border px-3 text-sm"
                        value={query.status}
                        onChange={(event) => update('status', event.target.value)}
                        aria-label="Lọc trạng thái"
                    >
                        <option value="all">Tất cả trạng thái</option>
                        <option value="active">Đang bán</option>
                        <option value="inactive">Ngừng bán</option>
                    </select>
                </div>
                <div className="bg-card flex flex-wrap gap-2 rounded-lg border p-3 shadow-sm">
                    <select
                        className="bg-background h-10 rounded-md border px-3 text-sm"
                        value={query.sort}
                        onChange={(event) => update('sort', event.target.value)}
                        aria-label="Sắp xếp sản phẩm"
                    >
                        <option value="latest">Mới tạo</option>
                        <option value="name">Tên A-Z</option>
                        <option value="sku">SKU</option>
                    </select>
                </div>
                <div className="bg-card overflow-hidden rounded-lg border shadow-sm">
                    <ProductTable products={products.data} onEdit={editProduct} canManageCatalog={canManageCatalog} />
                    <CollectionState
                        isEmpty={!products.data.length}
                        hasFilters={Boolean(query.search || query.category_id || query.status !== 'all' || query.sort !== 'latest')}
                        onReset={reset}
                        label="sản phẩm"
                    />
                    <Pagination paginator={products} routeUrl={route('products.index')} query={query} />
                </div>
            </div>
            <ProductFormDialog
                open={open}
                editingId={editingId}
                form={form}
                categories={categories}
                units={units}
                firstUnit={firstUnit}
                onOpenChange={(value) => {
                    setOpen(value);
                    if (!value) {
                        setEditingId(null);
                        form.clearErrors();
                    }
                }}
                onSubmit={submit}
                updateUnit={updateUnit}
                chooseExclusive={chooseExclusive}
            />
        </AppLayout>
    );
}
