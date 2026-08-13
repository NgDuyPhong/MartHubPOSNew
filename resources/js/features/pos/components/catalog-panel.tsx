import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatMoney, formatQuantity } from '@/lib/format';
import { Package, Search } from 'lucide-react';
import { useMemo } from 'react';
import { filterCatalog } from '../model/selectors';
import type { Product, ProductUnit, Variant } from '../model/types';

type Category = { id: number; name: string; color?: string };

export function CatalogPanel({
    catalog,
    categories,
    query,
    categoryId,
    searchRef,
    onQueryChange,
    onCategoryChange,
    onSearchKey,
    onAdd,
}: {
    catalog: Product[];
    categories: Category[];
    query: string;
    categoryId: number | null;
    searchRef: React.RefObject<HTMLInputElement | null>;
    onQueryChange: (value: string) => void;
    onCategoryChange: (value: number | null) => void;
    onSearchKey: (event: React.KeyboardEvent<HTMLInputElement>) => void;
    onAdd: (product: Product, variant: Variant, unit: ProductUnit) => void;
}) {
    const products = useMemo(() => filterCatalog(catalog, query, categoryId), [catalog, categoryId, query]);
    const addDefault = (product: Product) => {
        const variant = product.variants[0];
        const unit = variant?.units.find((item) => item.is_default_sale) ?? variant?.units[0];
        if (variant && unit) onAdd(product, variant, unit);
    };

    return (
        <section className="flex min-h-[420px] flex-col overflow-hidden rounded-lg border bg-white shadow-sm lg:col-span-2 lg:min-h-0">
            <div className="border-b p-3">
                <div className="relative">
                    <Search className="absolute top-2.5 left-3 size-4 text-slate-400" />
                    <Input
                        ref={searchRef}
                        value={query}
                        onChange={(event) => onQueryChange(event.target.value)}
                        onKeyDown={onSearchKey}
                        className="pl-9"
                        autoFocus
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
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
                <div className="grid auto-rows-min grid-cols-2 gap-2 xl:grid-cols-3">
                    {products.map((product) => {
                        const variant = product.variants[0];
                        const unit = variant?.units.find((item) => item.is_default_sale) ?? variant?.units[0];
                        const stock = Number(variant?.balances[0]?.quantity_base ?? 0);
                        return (
                            <button
                                key={product.id}
                                onClick={() => addDefault(product)}
                                className="group flex min-h-32 flex-col rounded-lg border bg-white p-3 text-left transition hover:border-blue-500 hover:shadow-md"
                            >
                                {product.image_path ? (
                                    <img src={`/storage/${product.image_path}`} alt="" className="mb-2 size-12 rounded-md object-cover" />
                                ) : (
                                    <div className="mb-2 flex size-9 items-center justify-center rounded-md bg-blue-50 text-blue-600">
                                        <Package className="size-5" />
                                    </div>
                                )}
                                <span className="line-clamp-2 min-h-10 text-sm font-semibold">{product.name}</span>
                                <span className="text-xs text-slate-500">
                                    {product.sku} · Tồn {formatQuantity(stock)}
                                </span>
                                <div className="mt-auto flex w-full items-end justify-between">
                                    <strong className="text-blue-700">{formatMoney(unit?.sale_price ?? 0)}đ</strong>
                                    <span className="text-xs">/{unit?.unit.name}</span>
                                </div>
                                {variant && variant.units.length > 1 && (
                                    <div className="mt-2 flex flex-wrap gap-1" onClick={(event) => event.stopPropagation()}>
                                        {variant.units.map((choice) => (
                                            <span
                                                key={choice.id}
                                                role="button"
                                                onClick={() => onAdd(product, variant, choice)}
                                                className="rounded bg-slate-100 px-1.5 py-1 text-[11px] hover:bg-blue-100"
                                            >
                                                {choice.unit.name}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
