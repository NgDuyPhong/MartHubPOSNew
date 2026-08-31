import { CollectionState, FilterBar, PageHeader, PageShell, Pagination, SearchField } from '@/components/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { NativeSelect } from '@/components/ui/native-select';
import { useListQuery } from '@/hooks/use-list-query';
import { useOrganizationTimezone } from '@/hooks/use-organization-timezone';
import AppLayout from '@/layouts/app-layout';
import { formatDate, formatQuantity } from '@/lib/format';
import type { Paginated } from '@/types/pagination';
import { Head, Link } from '@inertiajs/react';
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
    const timezone = useOrganizationTimezone();
    const { query, update, reset, isLoading, error, retry } = useListQuery(route('inventory.index'), { ...filters, page: 1 });
    const hasFilters = Boolean(query.search || query.stock !== 'all');
    return (
        <AppLayout breadcrumbs={[{ title: 'Tồn kho', href: '/inventory' }]}>
            <Head title="Tồn kho" />
            <PageShell>
                <PageHeader
                    title="Tồn kho & hạn sử dụng"
                    description="Số lượng hiển thị theo đơn vị cơ sở; tồn âm vẫn được phép bán và cần đối soát."
                    actions={
                        <Button asChild>
                            <Link href="/stock-receipts">
                                <PackagePlus />
                                Bổ sung tồn
                            </Link>
                        </Button>
                    }
                />
                {expiringLots.total > 0 && (
                    <div className="border-warning/40 bg-warning-muted text-warning-muted-foreground rounded-lg border p-4">
                        <h2 className="mb-2 flex items-center font-semibold">
                            <AlertTriangle className="text-warning-text mr-2 size-5" />
                            Lô hết hạn hoặc sẽ hết hạn trong 7 ngày
                        </h2>
                        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                            {expiringLots.data.map((lot) => (
                                <div key={lot.id} className="bg-background rounded-md border p-3 text-sm">
                                    <div className="font-semibold">{lot.product_variant.product.name}</div>
                                    <div className="text-muted-foreground">
                                        Lô {lot.lot_number || 'không mã'} · HSD {formatDate(lot.expiry_date, timezone)}
                                    </div>
                                    <Badge className="mt-2" variant="warning">
                                        Chỉ cảnh báo, không chặn bán
                                    </Badge>
                                </div>
                            ))}
                        </div>
                        <Pagination paginator={expiringLots} routeUrl={route('inventory.index')} query={query} pageKey="expiry_page" />
                    </div>
                )}
                <FilterBar>
                    <SearchField value={query.search} onChange={(value) => update('search', value)} placeholder="Tìm SKU hoặc tên sản phẩm…" />
                    <NativeSelect
                        value={query.stock}
                        onChange={(event) => update('stock', event.target.value)}
                        aria-label="Lọc trạng thái tồn"
                        className="md:w-44 md:shrink-0"
                    >
                        <option value="all">Tất cả tồn</option>
                        <option value="negative">Tồn âm</option>
                        <option value="empty">Hết tồn</option>
                        <option value="positive">Còn hàng</option>
                    </NativeSelect>
                </FilterBar>
                <div className="bg-card overflow-hidden rounded-lg border shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[640px] text-sm" aria-label="Danh sách tồn kho">
                            <thead className="bg-muted text-muted-foreground text-left text-xs font-semibold tracking-wide uppercase">
                                <tr>
                                    <th scope="col" className="px-4 py-3">
                                        SKU
                                    </th>
                                    <th scope="col" className="px-4 py-3">
                                        Sản phẩm
                                    </th>
                                    <th scope="col" className="px-4 py-3 text-right">
                                        Tồn đơn vị gốc
                                    </th>
                                    <th scope="col" className="px-4 py-3">
                                        Trạng thái
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {balances.data.map((balance) => {
                                    const qty = Number(balance.quantity_base);
                                    return (
                                        <tr key={balance.id} className="hover:bg-muted/50 border-t transition-colors">
                                            <td className="text-muted-foreground px-4 py-3">{balance.variant.product.sku}</td>
                                            <td className="px-4 font-medium">{balance.variant.product.name}</td>
                                            <td className={`px-4 text-right font-bold ${qty < 0 ? 'text-destructive' : ''}`}>
                                                {formatQuantity(qty)}
                                            </td>
                                            <td className="px-4">
                                                {qty < 0 ? (
                                                    <Badge variant="destructive">Tồn kho âm</Badge>
                                                ) : qty === 0 ? (
                                                    <Badge variant="warning">Hết tồn hệ thống</Badge>
                                                ) : (
                                                    <Badge variant="success">Còn hàng</Badge>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    <CollectionState
                        isEmpty={!balances.data.length}
                        hasFilters={hasFilters}
                        onReset={reset}
                        error={error}
                        onRetry={retry}
                        isLoading={isLoading}
                        label="mặt hàng tồn kho"
                    />
                    <Pagination paginator={balances} routeUrl={route('inventory.index')} query={query} />
                </div>
            </PageShell>
        </AppLayout>
    );
}
