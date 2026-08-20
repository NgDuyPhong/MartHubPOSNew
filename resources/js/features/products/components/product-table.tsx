import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatMoney, formatQuantity } from '@/lib/format';
import { Link } from '@inertiajs/react';
import { Package, Pencil, Power } from 'lucide-react';
import { useState } from 'react';
import type { Product } from '../model/types';

function ProductThumbnail({ product }: { product: Product }) {
    const [failed, setFailed] = useState(false);

    if (!product.image_url || failed) {
        return (
            <div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-md">
                <Package className="size-5" aria-hidden="true" />
            </div>
        );
    }

    return (
        <img
            src={product.image_url}
            alt={`Ảnh sản phẩm ${product.name}`}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setFailed(true)}
            className="size-10 shrink-0 rounded-md object-cover"
        />
    );
}

export function ProductTable({
    products,
    onStatus,
    canManageCatalog,
}: {
    products: Product[];
    onStatus: (product: Product) => void;
    canManageCatalog: boolean;
}) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead className="bg-muted text-muted-foreground text-left text-xs uppercase">
                    <tr>
                        <th className="px-4 py-3">Sản phẩm</th>
                        <th className="px-4 py-3">Danh mục</th>
                        <th className="px-4 py-3">Quy cách bán</th>
                        <th className="px-4 py-3 text-right">Tồn đơn vị gốc</th>
                        <th className="px-4 py-3 text-right">Giá vốn cuối</th>
                        <th className="px-4 py-3">Trạng thái</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    {products.map((product) => {
                        const variant = product.variants[0];
                        return (
                            <tr key={product.id} className="hover:bg-muted/50 border-t align-top">
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-3">
                                        <ProductThumbnail product={product} />
                                        <div>
                                            <div className="font-semibold">{product.name}</div>
                                            <div className="text-muted-foreground text-xs">
                                                {product.sku}
                                                {product.track_expiry ? ' · Theo dõi HSD' : ''}
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-4 py-3">{product.category?.name ?? '—'}</td>
                                <td className="px-4 py-3">
                                    <div className="flex flex-wrap gap-1">
                                        {variant?.units.map((item) => (
                                            <span key={item.id} className="bg-muted rounded border px-2 py-1 text-xs">
                                                {item.unit.name} × {Number(item.conversion_to_base)} · {formatMoney(item.sale_price)}đ{' '}
                                                {item.is_base && <b className="text-blue-700">(gốc)</b>}
                                                <small className="text-muted-foreground block">{item.barcodes[0]?.value || 'chưa có barcode'}</small>
                                            </span>
                                        ))}
                                    </div>
                                </td>
                                <td
                                    className={`px-4 py-3 text-right font-semibold ${Number(variant?.balances[0]?.quantity_base ?? 0) < 0 ? 'text-red-600' : ''}`}
                                >
                                    {formatQuantity(Number(variant?.balances[0]?.quantity_base ?? 0))}
                                </td>
                                <td className="px-4 py-3 text-right">{formatMoney(variant?.last_cost_base ?? 0)}đ</td>
                                <td className="px-4 py-3">
                                    {product.is_active ? <Badge>Đang bán</Badge> : <Badge variant="outline">Ngừng bán</Badge>}
                                </td>
                                <td className="px-4">
                                    {canManageCatalog && (
                                        <div className="flex items-center justify-end gap-1">
                                            <Button asChild size="sm" variant="ghost">
                                                <Link href={route('products.edit', product.id)}>
                                                    <Pencil />
                                                    Sửa
                                                </Link>
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => onStatus(product)}
                                                aria-label={product.is_active ? `Ngừng bán ${product.name}` : `Bán lại ${product.name}`}
                                            >
                                                <Power />
                                                {product.is_active ? 'Ngừng bán' : 'Bán lại'}
                                            </Button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
