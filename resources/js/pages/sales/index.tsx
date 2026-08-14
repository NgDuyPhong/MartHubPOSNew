import { Badge } from '@/components/ui/badge';
import { CollectionState, Pagination, SearchField } from '@/components/shared';
import { useListQuery } from '@/hooks/use-list-query';
import AppLayout from '@/layouts/app-layout';
import { formatDateTime, formatMoney } from '@/lib/format';
import type { Paginated } from '@/types/pagination';
import { Head, Link } from '@inertiajs/react';

export default function SalesPage({
    sales,
    filters,
}: {
    sales: Paginated<{
            id: number;
            invoice_number: string;
            total: number;
            paid_amount: number;
            debt_amount: number;
            source: string;
            sold_at: string;
            items_count: number;
            customer?: { name: string };
        }>;
    filters: { search: string; status: string; source: string; from: string | null; to: string | null; sort: string; per_page: number };
}) {
    const { query, update, reset } = useListQuery(route('sales.index'), { ...filters, page: 1 });
    const hasFilters = Boolean(query.search || query.status !== 'all' || query.source !== 'all' || query.from || query.to || query.sort !== 'latest');
    return (
        <AppLayout breadcrumbs={[{ title: 'Hóa đơn', href: '/sales' }]}>
            <Head title="Hóa đơn" />
            <div className="flex flex-col gap-4 p-4 md:p-5 lg:p-6">
                <div>
                    <h1 className="text-2xl font-bold">Hóa đơn bán hàng</h1>
                    <p className="text-sm text-slate-500">Dữ liệu snapshot giữ nguyên tên, đơn vị, giá, chiết khấu và giá vốn tại thời điểm bán.</p>
                </div>
                <div className="flex flex-col gap-3 rounded-lg border bg-card p-3 shadow-sm md:flex-row md:items-center">
                    <SearchField value={query.search} onChange={(value) => update('search', value)} placeholder="Tìm mã hóa đơn hoặc khách hàng…" />
                    <select className="bg-background h-10 rounded-md border px-3 text-sm" value={query.status} onChange={(event) => update('status', event.target.value)} aria-label="Lọc thanh toán"><option value="all">Tất cả thanh toán</option><option value="paid">Đã đủ</option><option value="debt">Còn nợ</option></select>
                    <select className="bg-background h-10 rounded-md border px-3 text-sm" value={query.source} onChange={(event) => update('source', event.target.value)} aria-label="Lọc nguồn"><option value="all">Mọi nguồn</option><option value="online">Online</option><option value="offline_sync">Offline đã sync</option></select>
                </div>
                <div className="flex flex-wrap gap-2 rounded-lg border bg-card p-3 shadow-sm">
                    <input type="date" className="bg-background h-10 rounded-md border px-3 text-sm" value={query.from ?? ''} onChange={(event) => update('from', event.target.value || null)} aria-label="Từ ngày" />
                    <input type="date" className="bg-background h-10 rounded-md border px-3 text-sm" value={query.to ?? ''} onChange={(event) => update('to', event.target.value || null)} aria-label="Đến ngày" />
                    <select className="bg-background h-10 rounded-md border px-3 text-sm" value={query.sort} onChange={(event) => update('sort', event.target.value)} aria-label="Sắp xếp"><option value="latest">Mới nhất</option><option value="oldest">Cũ nhất</option><option value="total">Tổng tiền cao nhất</option></select>
                </div>
                <div className="bg-card overflow-hidden rounded-lg border shadow-sm">
                    <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-muted text-muted-foreground text-left text-xs uppercase">
                            <tr>
                                <th className="px-4 py-3">Hóa đơn</th>
                                <th className="px-4 py-3">Thời gian</th>
                                <th className="px-4 py-3">Khách hàng</th>
                                <th className="px-4 py-3 text-right">Tổng</th>
                                <th className="px-4 py-3 text-right">Đã thu</th>
                                <th className="px-4 py-3 text-right">Còn nợ</th>
                                <th className="px-4 py-3">Nguồn</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sales.data.map((sale) => (
                                <tr key={sale.id} className="border-t">
                                    <td className="px-4 py-3">
                                        <Link href={`/sales/${sale.id}`} className="font-semibold text-blue-700">
                                            {sale.invoice_number}
                                        </Link>
                                        <div className="text-xs text-slate-500">{sale.items_count} dòng</div>
                                    </td>
                                    <td className="px-4">{formatDateTime(sale.sold_at)}</td>
                                    <td className="px-4">{sale.customer?.name ?? 'Khách lẻ'}</td>
                                    <td className="px-4 text-right font-bold">{formatMoney(sale.total)}đ</td>
                                    <td className="px-4 text-right text-emerald-700">{formatMoney(sale.paid_amount)}đ</td>
                                    <td className="px-4 text-right text-red-600">{formatMoney(sale.debt_amount)}đ</td>
                                    <td className="px-4">
                                        <Badge variant="outline">{sale.source === 'offline_sync' ? 'Offline đã sync' : 'Online'}</Badge>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    </div>
                    <CollectionState isEmpty={!sales.data.length} hasFilters={hasFilters} onReset={reset} label="hóa đơn" />
                    <Pagination paginator={sales} routeUrl={route('sales.index')} query={query} />
                </div>
            </div>
        </AppLayout>
    );
}
