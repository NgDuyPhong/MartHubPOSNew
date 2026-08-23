import { CollectionState, DateRangeFilter, FilterBar, getDateRangeError, PageHeader, PageShell, Pagination, SearchField } from '@/components/shared';
import { Badge } from '@/components/ui/badge';
import { NativeSelect } from '@/components/ui/native-select';
import { useListQuery } from '@/hooks/use-list-query';
import { useOrganizationTimezone } from '@/hooks/use-organization-timezone';
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
    const { query, update, reset, isLoading, error, retry } = useListQuery(
        route('sales.index'),
        { ...filters, page: 1 },
        { canRequest: (nextQuery) => !getDateRangeError(nextQuery.from, nextQuery.to) },
    );
    const dateRangeError = getDateRangeError(query.from, query.to);
    const timezone = useOrganizationTimezone();
    const hasFilters = Boolean(query.search || query.status !== 'all' || query.source !== 'all' || query.from || query.to || query.sort !== 'latest');
    return (
        <AppLayout breadcrumbs={[{ title: 'Hóa đơn', href: '/sales' }]}>
            <Head title="Hóa đơn" />
            <PageShell>
                <PageHeader
                    title="Hóa đơn bán hàng"
                    description="Dữ liệu snapshot giữ nguyên tên, đơn vị, giá, chiết khấu và giá vốn tại thời điểm bán."
                />
                <FilterBar>
                    <SearchField value={query.search} onChange={(value) => update('search', value)} placeholder="Tìm mã hóa đơn hoặc khách hàng…" />
                    <NativeSelect
                        value={query.status}
                        onChange={(event) => update('status', event.target.value)}
                        aria-label="Lọc thanh toán"
                        className="md:w-44 md:shrink-0"
                    >
                        <option value="all">Tất cả thanh toán</option>
                        <option value="paid">Đã đủ</option>
                        <option value="debt">Còn nợ</option>
                    </NativeSelect>
                    <NativeSelect
                        value={query.source}
                        onChange={(event) => update('source', event.target.value)}
                        aria-label="Lọc nguồn"
                        className="md:w-44 md:shrink-0"
                    >
                        <option value="all">Mọi nguồn</option>
                        <option value="online">Online</option>
                        <option value="offline_sync">Offline đã sync</option>
                    </NativeSelect>
                </FilterBar>
                <FilterBar>
                    <DateRangeFilter
                        from={query.from}
                        to={query.to}
                        onFromChange={(value) => update('from', value)}
                        onToChange={(value) => update('to', value)}
                        error={dateRangeError}
                    />
                    <NativeSelect
                        value={query.sort}
                        onChange={(event) => update('sort', event.target.value)}
                        aria-label="Sắp xếp"
                        className="md:w-52 md:shrink-0"
                    >
                        <option value="latest">Mới nhất</option>
                        <option value="oldest">Cũ nhất</option>
                        <option value="total">Tổng tiền cao nhất</option>
                    </NativeSelect>
                </FilterBar>
                <div className="bg-card overflow-hidden rounded-lg border shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[860px] text-sm" aria-label="Danh sách hóa đơn">
                            <thead className="bg-muted text-muted-foreground text-left text-xs font-semibold tracking-wide uppercase">
                                <tr>
                                    <th scope="col" className="px-4 py-3">
                                        Hóa đơn
                                    </th>
                                    <th scope="col" className="px-4 py-3">
                                        Thời gian
                                    </th>
                                    <th scope="col" className="px-4 py-3">
                                        Khách hàng
                                    </th>
                                    <th scope="col" className="px-4 py-3 text-right">
                                        Tổng
                                    </th>
                                    <th scope="col" className="px-4 py-3 text-right">
                                        Đã thu
                                    </th>
                                    <th scope="col" className="px-4 py-3 text-right">
                                        Còn nợ
                                    </th>
                                    <th scope="col" className="px-4 py-3">
                                        Nguồn
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {sales.data.map((sale) => (
                                    <tr key={sale.id} className="hover:bg-muted/50 border-t transition-colors">
                                        <td className="px-4 py-3">
                                            <Link href={`/sales/${sale.id}`} className="text-primary font-semibold">
                                                {sale.invoice_number}
                                            </Link>
                                            <div className="text-muted-foreground text-xs">{sale.items_count} dòng</div>
                                        </td>
                                        <td className="px-4">{formatDateTime(sale.sold_at, timezone)}</td>
                                        <td className="px-4">{sale.customer?.name ?? 'Khách lẻ'}</td>
                                        <td className="px-4 text-right font-bold">{formatMoney(sale.total)}đ</td>
                                        <td className="text-success px-4 text-right">{formatMoney(sale.paid_amount)}đ</td>
                                        <td className="text-destructive px-4 text-right">{formatMoney(sale.debt_amount)}đ</td>
                                        <td className="px-4">
                                            <Badge variant="outline">{sale.source === 'offline_sync' ? 'Offline đã sync' : 'Online'}</Badge>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <CollectionState
                        isEmpty={!sales.data.length}
                        hasFilters={hasFilters}
                        onReset={reset}
                        error={error}
                        onRetry={retry}
                        isLoading={isLoading}
                        label="hóa đơn"
                    />
                    <Pagination paginator={sales} routeUrl={route('sales.index')} query={query} />
                </div>
            </PageShell>
        </AppLayout>
    );
}
