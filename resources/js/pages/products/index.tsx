import { CollectionState, FilterBar, PageHeader, Pagination, SearchField } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { NativeSelect } from '@/components/ui/native-select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { ProductQuickEditSheet, ProductStatusDialog, ProductTable, type Product } from '@/features/products';
import { useListQuery } from '@/hooks/use-list-query';
import AppLayout from '@/layouts/app-layout';
import type { Paginated } from '@/types/pagination';
import { Head, Link, useForm } from '@inertiajs/react';
import { Plus } from 'lucide-react';
import { useState } from 'react';

type ProductFilters = { search: string; category_id: number | null; status: string; sort: string; direction: string; per_page: number; page: number };

export default function ProductsPage({
    products,
    categories,
    filters,
    canManageCatalog,
}: {
    products: Paginated<Product>;
    categories: Array<{ id: number; name: string }>;
    units: Array<{ id: number; code: string; name: string }>;
    filters: Omit<ProductFilters, 'page'>;
    canManageCatalog: boolean;
}) {
    const { query, update, reset, isLoading, error, retry } = useListQuery<ProductFilters>(route('products.index'), {
        ...filters,
        status: filters.status || 'active',
        page: 1,
    });
    const [statusProduct, setStatusProduct] = useState<Product | null>(null);
    const [quickEditProduct, setQuickEditProduct] = useState<Product | null>(null);
    const [quickEditUnitId, setQuickEditUnitId] = useState<number | undefined>();
    const statusForm = useForm<{ is_active: boolean; updated_at: string }>({ is_active: false, updated_at: '' });
    const confirmStatus = () => {
        if (!statusProduct) return;

        const nextIsActive = !statusProduct.is_active;
        const updatedAt = statusProduct.updated_at ?? '';

        statusForm.transform(() => ({ is_active: nextIsActive, updated_at: updatedAt }));
        statusForm.patch(route('products.status.update', statusProduct.id), { preserveScroll: true, onSuccess: () => setStatusProduct(null) });
    };

    return (
        <AppLayout breadcrumbs={[{ title: 'Sản phẩm', href: route('products.index') }]}>
            <Head title="Sản phẩm" />
            <div className="flex flex-col gap-4 p-4 md:p-5 lg:p-6">
                <PageHeader
                    title="Sản phẩm & đơn vị bán"
                    description="Tồn kho lưu theo đơn vị cơ sở; barcode gắn với từng quy cách."
                    actions={
                        canManageCatalog ? (
                            <Button asChild>
                                <Link href={route('products.create')}>
                                    <Plus />
                                    Thêm sản phẩm
                                </Link>
                            </Button>
                        ) : undefined
                    }
                />
                <FilterBar>
                    <SearchField value={query.search} onChange={(value) => update('search', value)} placeholder="Tìm tên, SKU hoặc barcode…" />
                    <SearchableSelect
                        value={query.category_id === null ? null : String(query.category_id)}
                        options={categories.map((category) => ({ value: String(category.id), label: category.name, searchText: category.name }))}
                        onValueChange={(value) => update('category_id', value ? Number(value) : null)}
                        placeholder="Tất cả danh mục"
                        searchPlaceholder="Tìm danh mục…"
                        emptyText="Không tìm thấy danh mục."
                        aria-label="Lọc theo danh mục"
                        clearable
                        className="md:min-w-56"
                    />
                    <NativeSelect value={query.status} onChange={(event) => update('status', event.target.value)} aria-label="Lọc trạng thái">
                        <option value="all">Tất cả trạng thái</option>
                        <option value="active">Đang bán</option>
                        <option value="inactive">Ngừng bán</option>
                    </NativeSelect>
                    <NativeSelect
                        value={query.sort}
                        onChange={(event) => {
                            update('sort', event.target.value);
                            update('direction', event.target.value === 'latest' ? 'desc' : 'asc');
                        }}
                        aria-label="Sắp xếp sản phẩm"
                    >
                        <option value="latest">Mới tạo</option>
                        <option value="name">Tên A-Z</option>
                        <option value="sku">SKU</option>
                    </NativeSelect>
                    <NativeSelect value={query.direction} onChange={(event) => update('direction', event.target.value)} aria-label="Chiều sắp xếp">
                        <option value="asc">Tăng dần</option>
                        <option value="desc">Giảm dần</option>
                    </NativeSelect>
                </FilterBar>
                <div className="bg-card overflow-hidden rounded-lg border">
                    <ProductTable
                        products={products.data}
                        onStatus={setStatusProduct}
                        onQuickEdit={(product, unitId) => {
                            setQuickEditProduct(product);
                            setQuickEditUnitId(unitId);
                        }}
                        canManageCatalog={canManageCatalog}
                    />
                    <CollectionState
                        isEmpty={!products.data.length}
                        hasFilters={Boolean(query.search || query.category_id || query.status !== 'active' || query.sort !== 'latest')}
                        onReset={reset}
                        error={error}
                        onRetry={retry}
                        isLoading={isLoading}
                        label="sản phẩm"
                    />
                    <Pagination paginator={products} routeUrl={route('products.index')} query={query} />
                </div>
                <ProductStatusDialog
                    product={statusProduct}
                    open={statusProduct !== null}
                    processing={statusForm.processing}
                    onOpenChange={(open) => {
                        if (!open) setStatusProduct(null);
                    }}
                    onConfirm={confirmStatus}
                />
                <ProductQuickEditSheet
                    product={quickEditProduct}
                    unitId={quickEditUnitId}
                    categories={categories}
                    open={quickEditProduct !== null}
                    onOpenChange={(open) => {
                        if (!open) {
                            setQuickEditProduct(null);
                            setQuickEditUnitId(undefined);
                        }
                    }}
                />
            </div>
        </AppLayout>
    );
}
