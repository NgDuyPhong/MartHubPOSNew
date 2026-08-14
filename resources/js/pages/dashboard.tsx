import { Badge } from '@/components/ui/badge';
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
    const cards = [
        { label: 'Doanh thu hôm nay', value: `${formatMoney(summary.revenue)}đ`, icon: Banknote, tone: 'bg-blue-600' },
        { label: 'Hóa đơn', value: formatMoney(summary.orders), icon: FileText, tone: 'bg-emerald-600' },
        { label: 'Tiền mặt / QR', value: `${formatMoney(summary.cash)} / ${formatMoney(summary.qr)}`, icon: QrCode, tone: 'bg-violet-600' },
        { label: 'Tổng công nợ', value: `${formatMoney(summary.debt)}đ`, icon: Users, tone: 'bg-orange-600' },
    ];
    return (
        <AppLayout breadcrumbs={[{ title: 'Tổng quan', href: '/dashboard' }]}>
            <Head title="Tổng quan" />
            <div className="space-y-4 p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Tổng quan cửa hàng</h1>
                        <p className="text-sm text-slate-500">Số liệu vận hành trong ngày</p>
                    </div>
                    <Link href="/pos" className="flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white">
                        <ShoppingCart className="mr-2 size-4" />
                        Mở màn hình bán hàng
                    </Link>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {cards.map((card) => (
                        <div key={card.label} className="rounded-lg border bg-white p-4 shadow-sm">
                            <div className={`mb-3 flex size-9 items-center justify-center rounded-md text-white ${card.tone}`}>
                                <card.icon className="size-5" />
                            </div>
                            <div className="text-sm text-slate-500">{card.label}</div>
                            <div className="mt-1 text-xl font-bold">{card.value}</div>
                        </div>
                    ))}
                </div>
                <div className="grid gap-4 xl:grid-cols-3">
                    <div className="overflow-hidden rounded-lg border bg-white shadow-sm xl:col-span-2">
                        <div className="flex items-center justify-between border-b px-4 py-3"><span className="font-semibold">Hóa đơn gần đây</span><Link href="/sales" className="text-primary text-sm font-medium">Xem tất cả</Link></div>
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 text-left text-xs text-slate-500 uppercase">
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
                                            <Link href={`/sales/${sale.id}`} className="font-medium text-blue-700">
                                                {sale.invoice_number}
                                            </Link>
                                        </td>
                                        <td className="px-4">{sale.customer?.name ?? 'Khách lẻ'}</td>
                                        <td className="px-4 text-slate-500">{formatDateTime(sale.sold_at)}</td>
                                        <td className="px-4 text-right font-semibold">{formatMoney(sale.total)}đ</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="space-y-3">
                        <Link href="/inventory" className="flex items-center justify-between rounded-lg border bg-white p-4 shadow-sm">
                            <div className="flex items-center gap-3">
                                <Boxes className="size-6 text-red-600" />
                                <div>
                                    <div className="font-semibold">Tồn kho âm</div>
                                    <div className="text-xs text-slate-500">Cần kiểm kê / nhập bù</div>
                                </div>
                            </div>
                            <Badge variant={summary.negativeStock ? 'destructive' : 'outline'}>{summary.negativeStock}</Badge>
                        </Link>
                        <Link href="/inventory" className="flex items-center justify-between rounded-lg border bg-white p-4 shadow-sm">
                            <div className="flex items-center gap-3">
                                <AlertTriangle className="size-6 text-orange-600" />
                                <div>
                                    <div className="font-semibold">Cận/hết hạn 7 ngày</div>
                                    <div className="text-xs text-slate-500">Cảnh báo, không chặn bán</div>
                                </div>
                            </div>
                            <Badge className="bg-orange-100 text-orange-800">{summary.expiring}</Badge>
                        </Link>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
