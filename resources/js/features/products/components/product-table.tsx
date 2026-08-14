import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatMoney, formatQuantity } from '@/lib/format';
import { Pencil } from 'lucide-react';
import type { Product } from '../model/types';

export function ProductTable({ products, onEdit, canManageCatalog }: { products: Product[]; onEdit: (product: Product) => void; canManageCatalog: boolean }) {
    return (
        <div className="bg-card overflow-hidden rounded-lg border shadow-sm">
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
                                    <div className="font-semibold">{product.name}</div>
                                    <div className="text-muted-foreground text-xs">
                                        {product.sku}
                                        {product.track_expiry ? ' · Theo dõi HSD' : ''}
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
                                <td className="px-4 py-3">{product.is_active ? <Badge>Đang bán</Badge> : <Badge variant="outline">Ngừng bán</Badge>}</td>
                                <td className="px-4">
                                    {canManageCatalog && (
                                        <Button size="sm" variant="ghost" onClick={() => onEdit(product)}>
                                            <Pencil className="mr-1 size-3" />
                                            Sửa
                                        </Button>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
            </div>
        </div>
    );
}
