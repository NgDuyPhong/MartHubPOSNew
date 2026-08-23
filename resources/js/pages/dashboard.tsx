import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useOrganizationTimezone } from '@/hooks/use-organization-timezone';
import AppLayout from '@/layouts/app-layout';
import { formatDateTime, formatMoney } from '@/lib/format';
import { Head, Link } from '@inertiajs/react';
import { AlertTriangle, Banknote, Boxes, FileText, QrCode, ShoppingCart, Users } from 'lucide-react';

export default function Dashboard({
    summary,
    recentSales,
}: {
    summary: { revenue: number; orders: number; cash: number; qr: number; debt: number; negativeStock: number; expiring: number };
    recentSales: Array<{ id: number; invoice_number: string; total: number; debt_amount: number; sold_at: string; customer?: { name: string } }>;
}) {
    const timezone = useOrganizationTimezone();

    const cards = [
        { label: 'Doanh thu hôm nay', value: `${formatMoney(summary.revenue)}đ`, icon: Banknote, tone: 'bg-info text-info-foreground' },
        { label: 'Hóa đơn', value: formatMoney(summary.orders), icon: FileText, tone: 'bg-success text-success-foreground' },
        { label: 'Tiền mặt / QR', value: `${formatMoney(summary.cash)} / ${formatMoney(summary.qr)}`, icon: QrCode, tone: 'bg-primary' },
        { label: 'Tổng công nợ', value: `${formatMoney(summary.debt)}đ`, icon: Users, tone: 'bg-warning text-warning-foreground' },
    ];
    return (
        <AppLayout breadcrumbs={[{ title: 'Tổng quan', href: '/dashboard' }]}>
            <Head title="Tổng quan" />
            <div className="space-y-4 p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Tổng quan cửa hàng</h1>
                        <p className="text-muted-foreground text-sm">Số liệu vận hành trong ngày</p>
                    </div>
                    <Button asChild>
                        <Link href="/pos">
                            <ShoppingCart />
                            Mở màn hình bán hàng
                        </Link>
                    </Button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {cards.map((card) => (
                        <div key={card.label} className="bg-card rounded-lg border p-4 shadow-sm">
                            <div className={`text-primary-foreground mb-3 flex size-9 items-center justify-center rounded-md ${card.tone}`}>
                                <card.icon className="size-5" />
                            </div>
                            <div className="text-muted-foreground text-sm">{card.label}</div>
                            <div className="mt-1 text-xl font-bold">{card.value}</div>
                        </div>
                    ))}
                </div>
                <div className="grid gap-4 xl:grid-cols-3">
                    <div className="bg-card overflow-hidden rounded-lg border shadow-sm xl:col-span-2">
                        <div className="flex items-center justify-between border-b px-4 py-3">
                            <span className="font-semibold">Hóa đơn gần đây</span>
                            <Link href="/sales" className="text-primary text-sm font-medium">
                                Xem tất cả
                            </Link>
                        </div>
                        <table className="w-full text-sm">
                            <thead className="bg-muted text-muted-foreground text-left text-xs uppercase">
                                <tr>
                                    <th className="px-4 py-2">Số hóa đơn</th>
                                    <th className="px-4 py-2">Khách hàng</th>
                                    <th className="px-4 py-2">Thời gian</th>
                                    <th className="px-4 py-2 text-right">Tổng</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentSales.map((sale) => (
                                    <tr key={sale.id} className="border-t">
                                        <td className="px-4 py-3">
                                            <Link href={`/sales/${sale.id}`} className="text-primary font-medium">
                                                {sale.invoice_number}
                                            </Link>
                                        </td>
                                        <td className="px-4">{sale.customer?.name ?? 'Khách lẻ'}</td>
                                        <td className="text-muted-foreground px-4">{formatDateTime(sale.sold_at, timezone)}</td>
                                        <td className="px-4 text-right font-semibold">{formatMoney(sale.total)}đ</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="space-y-3">
                        <Link
                            href="/inventory"
                            className="bg-card hover:bg-muted/50 flex items-center justify-between rounded-lg border p-4 shadow-sm"
                        >
                            <div className="flex items-center gap-3">
                                <Boxes className="text-destructive size-6" />
                                <div>
                                    <div className="font-semibold">Tồn kho âm</div>
                                    <div className="text-muted-foreground text-xs">Cần kiểm kê / nhập bù</div>
                                </div>
                            </div>
                            <Badge variant={summary.negativeStock ? 'destructive' : 'outline'}>{summary.negativeStock}</Badge>
                        </Link>
                        <Link
                            href="/inventory"
                            className="bg-card hover:bg-muted/50 flex items-center justify-between rounded-lg border p-4 shadow-sm"
                        >
                            <div className="flex items-center gap-3">
                                <AlertTriangle className="text-warning size-6" />
                                <div>
                                    <div className="font-semibold">Cận/hết hạn 7 ngày</div>
                                    <div className="text-muted-foreground text-xs">Cảnh báo, không chặn bán</div>
                                </div>
                            </div>
                            <Badge variant="warning">{summary.expiring}</Badge>
                        </Link>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
