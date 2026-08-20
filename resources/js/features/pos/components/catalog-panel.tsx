import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatMoney, formatQuantity } from '@/lib/format';
import { MoreHorizontal, Package, Search } from 'lucide-react';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { getDefaultSellableSelection } from '../model/selectors';
import type { Product, ProductUnit, Variant } from '../model/types';

type Category = { id: number; name: string; color?: string };
const INITIAL_PRODUCT_BATCH_SIZE = 100;
const PRODUCT_BATCH_SIZE = 100;

const CatalogProductCard = memo(function CatalogProductCard({
    product,
    onAdd,
    onPick,
    canManageCatalog,
    onQuickEdit,
}: {
    product: Product;
    onAdd: (product: Product, variant: Variant, unit: ProductUnit) => void;
    onPick: (product: Product) => void;
    canManageCatalog: boolean;
    onQuickEdit: (product: Product, unit?: ProductUnit) => void;
}) {
    const defaultSelection = getDefaultSellableSelection(product);
    const variant = defaultSelection?.variant;
    const unit = defaultSelection?.unit;
    const [imageFailed, setImageFailed] = useState(false);
    const stock = variant
        ? Number(variant.balances[0]?.quantity_base ?? 0)
        : product.variants.reduce((total, item) => total + Number(item.balances[0]?.quantity_base ?? 0), 0);
    const stockLabel = !defaultSelection
        ? 'Nhiều quy cách'
        : stock <= 0
          ? 'Hết tồn · vẫn cho bán âm'
          : stock <= 5
            ? `Tồn thấp: ${formatQuantity(stock)}`
            : `Tồn: ${formatQuantity(stock)}`;

    const addDefault = () => {
        if (variant && unit) onAdd(product, variant, unit);
        else onPick(product);
    };

    return (
        <div
            tabIndex={0}
            onContextMenu={(event) => {
                if (!canManageCatalog) return;
                event.preventDefault();
                onQuickEdit(product, unit);
            }}
            onKeyDown={(event) => {
                if (canManageCatalog && (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10'))) {
                    event.preventDefault();
                    onQuickEdit(product, unit);
                }
            }}
            className="group bg-card focus-visible:ring-ring hover:border-primary relative flex min-h-32 flex-col rounded-lg border p-3 text-left transition hover:shadow-md focus-visible:ring-2"
        >
            <button type="button" onClick={addDefault} className="flex min-w-0 flex-1 flex-col text-left">
                {product.image_url && !imageFailed ? (
                    <img
                        src={product.image_url}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        referrerPolicy="no-referrer"
                        onError={() => setImageFailed(true)}
                        className="mb-2 size-12 rounded-md object-cover"
                    />
                ) : (
                    <div className="bg-primary/10 text-primary mb-2 flex size-9 items-center justify-center rounded-md">
                        <Package className="size-5" />
                    </div>
                )}
                <span className="line-clamp-2 min-h-10 text-sm font-semibold">{product.name}</span>
                <span
                    className={`text-xs ${defaultSelection && stock <= 0 ? 'text-destructive' : defaultSelection && stock <= 5 ? 'text-warning' : 'text-muted-foreground'}`}
                >
                    {product.sku} · {stockLabel}
                </span>
                <div className="mt-auto flex w-full items-end justify-between">
                    <strong className="text-primary">{unit ? `${formatMoney(unit.sale_price)}đ` : 'Chọn quy cách'}</strong>
                    <span className="text-xs">{unit ? `/${unit.unit.name}` : 'Nhiều lựa chọn'}</span>
                </div>
            </button>
            {canManageCatalog && (
                <button
                    type="button"
                    className="hover:bg-accent focus-visible:ring-ring absolute top-2 right-2 rounded-md p-1.5 focus-visible:ring-2"
                    onClick={() => onQuickEdit(product, unit)}
                    aria-label={`Sửa nhanh ${product.name}`}
                    title="Sửa nhanh sản phẩm"
                >
                    <MoreHorizontal className="size-4" />
                </button>
            )}
        </div>
    );
});

export function CatalogPanel({
    categories,
    query,
    categoryId,
    products,
    totalMatches,
    isSearchPending,
    searchRef,
    onQueryChange,
    onCategoryChange,
    onSearchKey,
    onAdd,
    onPick,
    canManageCatalog,
    onQuickEdit,
}: {
    categories: Category[];
    query: string;
    categoryId: number | null;
    products: Product[];
    totalMatches: number;
    isSearchPending: boolean;
    searchRef: React.RefObject<HTMLInputElement | null>;
    onQueryChange: (value: string) => void;
    onCategoryChange: (value: number | null) => void;
    onSearchKey: (event: React.KeyboardEvent<HTMLInputElement>) => void;
    onAdd: (product: Product, variant: Variant, unit: ProductUnit) => void;
    onPick: (product: Product) => void;
    canManageCatalog: boolean;
    onQuickEdit: (product: Product, unit?: ProductUnit) => void;
}) {
    const [visibleCount, setVisibleCount] = useState(INITIAL_PRODUCT_BATCH_SIZE);
    const visibleProducts = useMemo(() => products.slice(0, visibleCount), [products, visibleCount]);
    const hasMoreProducts = visibleCount < products.length;

    useEffect(() => {
        setVisibleCount(INITIAL_PRODUCT_BATCH_SIZE);
    }, [categoryId, query]);

    const loadMoreProducts = useCallback(() => {
        setVisibleCount((current) => Math.min(current + PRODUCT_BATCH_SIZE, products.length));
    }, [products.length]);

    return (
        <section className="bg-card flex min-h-[420px] flex-col overflow-hidden rounded-lg border shadow-sm lg:col-span-2 lg:min-h-0">
            <div className="border-b p-3">
                <div className="relative">
                    <Search className="text-muted-foreground absolute top-2.5 left-3 size-4" />
                    <Input
                        ref={searchRef}
                        value={query}
                        onChange={(event) => onQueryChange(event.target.value)}
                        onKeyDown={onSearchKey}
                        className="pl-9"
                        autoFocus
                        aria-label="Tìm sản phẩm hoặc quét mã vạch"
                        placeholder="Quét mã vạch hoặc tìm tên, SKU (F3)"
                    />
                </div>
                <div className="mt-2 flex gap-1 overflow-x-auto pb-1">
                    <Button size="sm" variant={categoryId === null ? 'default' : 'outline'} onClick={() => onCategoryChange(null)}>
                        Tất cả
                    </Button>
                    {categories.map((category) => (
                        <Button
                            key={category.id}
                            size="sm"
                            variant={categoryId === category.id ? 'default' : 'outline'}
                            onClick={() => onCategoryChange(category.id)}
                        >
                            {category.name}
                        </Button>
                    ))}
                </div>
                <div className="text-muted-foreground mt-2 flex items-center justify-between text-xs" aria-live="polite">
                    <span>{totalMatches === 0 ? 'Không có sản phẩm phù hợp' : `Hiển thị ${visibleProducts.length}/${totalMatches} sản phẩm`}</span>
                    {isSearchPending && <span>Đang cập nhật…</span>}
                </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
                <div className="grid auto-rows-min grid-cols-2 gap-2 xl:grid-cols-3">
                    {visibleProducts.map((product) => (
                        <CatalogProductCard
                            key={product.id}
                            product={product}
                            onAdd={onAdd}
                            onPick={onPick}
                            canManageCatalog={canManageCatalog}
                            onQuickEdit={onQuickEdit}
                        />
                    ))}
                </div>
                {hasMoreProducts && (
                    <Button type="button" variant="outline" className="mt-3 w-full" onClick={loadMoreProducts}>
                        Xem thêm {Math.min(PRODUCT_BATCH_SIZE, products.length - visibleCount)} sản phẩm
                    </Button>
                )}
            </div>
        </section>
    );
}
