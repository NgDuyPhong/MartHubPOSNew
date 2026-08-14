import { Badge } from '@/components/ui/badge';
import { CollectionState, Pagination, SearchField } from '@/components/shared';
import { useListQuery } from '@/hooks/use-list-query';
import AppLayout from '@/layouts/app-layout';
import { formatDate, formatQuantity } from '@/lib/format';
import { Head, Link } from '@inertiajs/react';
import type { Paginated } from '@/types/pagination';
import { AlertTriangle, PackagePlus } from 'lucide-react';

export default function InventoryPage({
    balances,
    expiringLots,
    filters,
}: {
    balances: Paginated<{ id: number; quantity_base: string; variant: { sku: string; product: { name: string; sku: string } } }>;
    expiringLots: Paginated<{ id: number; lot_number?: string; expiry_date: string; product_variant: { product: { name: string; sku: string } } }>;
    filters: { search: string; stock: string; per_page: number };
}) {
    const { query, update, reset } = useListQuery(route('inventory.index'), { ...filters, page: 1 });
    const hasFilters = Boolean(query.search || query.stock !== 'all');
    return (
        <AppLayout breadcrumbs={[{ title: 'Tồn kho', href: '/inventory' }]}>
            <Head title="Tồn kho" />
            <div className="flex flex-col gap-4 p-4 md:p-5 lg:p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Tồn kho & hạn sử dụng</h1>
                        <p className="text-sm text-slate-500">Số lượng hiển thị theo đơn vị cơ sở; tồn âm vẫn được phép bán và cần đối soát.</p>
                    </div>
                    <Link href="/stock-receipts" className="flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white">
                        <PackagePlus className="mr-2 size-4" />
                        Bổ sung tồn
                    </Link>
                </div>
                {expiringLots.total > 0 && (
                    <div className="rounded-lg border border-orange-300 bg-orange-50 p-4">
                        <h2 className="mb-2 flex items-center font-semibold text-orange-900">
                            <AlertTriangle className="mr-2 size-5" />
                            Lô hết hạn hoặc sẽ hết hạn trong 7 ngày
                        </h2>
                        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                            {expiringLots.data.map((lot) => (
                                <div key={lot.id} className="rounded-md border border-orange-200 bg-white p-3 text-sm">
                                    <div className="font-semibold">{lot.product_variant.product.name}</div>
                                    <div className="text-slate-500">
                                        Lô {lot.lot_number || 'không mã'} · HSD {formatDate(lot.expiry_date)}
                                    </div>
                                    <Badge className="mt-2 bg-orange-100 text-orange-800">Chỉ cảnh báo, không chặn bán</Badge>
                                </div>
                            ))}
                        </div>
                        <Pagination paginator={expiringLots} routeUrl={route('inventory.index')} query={query} pageKey="expiry_page" />
                    </div>
                )}
                <div className="flex flex-col gap-3 rounded-lg border bg-card p-3 shadow-sm md:flex-row md:items-center">
                    <SearchField value={query.search} onChange={(value) => update('search', value)} placeholder="Tìm SKU hoặc tên sản phẩm…" />
                    <select className="bg-background h-10 rounded-md border px-3 text-sm" value={query.stock} onChange={(event) => update('stock', event.target.value)} aria-label="Lọc trạng thái tồn"><option value="all">Tất cả tồn</option><option value="negative">Tồn âm</option><option value="empty">Hết tồn</option><option value="positive">Còn hàng</option></select>
                </div>
                <div className="bg-card overflow-hidden rounded-lg border shadow-sm">
                    <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-muted text-muted-foreground text-left text-xs uppercase">
                            <tr>
                                <th className="px-4 py-3">SKU</th>
                                <th className="px-4 py-3">Sản phẩm</th>
                                <th className="px-4 py-3 text-right">Tồn đơn vị gốc</th>
                                <th className="px-4 py-3">Trạng thái</th>
                            </tr>
                        </thead>
                        <tbody>
                            {balances.data.map((balance) => {
                                const qty = Number(balance.quantity_base);
                                return (
                                    <tr key={balance.id} className="border-t">
                                        <td className="px-4 py-3 text-slate-500">{balance.variant.product.sku}</td>
                                        <td className="px-4 font-medium">{balance.variant.product.name}</td>
                                        <td className={`px-4 text-right font-bold ${qty < 0 ? 'text-red-600' : ''}`}>{formatQuantity(qty)}</td>
                                        <td className="px-4">
                                            {qty < 0 ? (
                                                <Badge variant="destructive">Tồn kho âm</Badge>
                                            ) : qty === 0 ? (
                                                <Badge className="bg-orange-100 text-orange-800">Hết tồn hệ thống</Badge>
                                            ) : (
                                                <Badge className="bg-emerald-100 text-emerald-800">Còn hàng</Badge>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    </div>
                    <CollectionState isEmpty={!balances.data.length} hasFilters={hasFilters} onReset={reset} label="mặt hàng tồn kho" />
                    <Pagination paginator={balances} routeUrl={route('inventory.index')} query={query} />
                </div>
            </div>
        </AppLayout>
    );
}
