import { Badge } from '@/components/ui/badge';
import AppLayout from '@/layouts/app-layout';
import { formatDate, formatQuantity } from '@/lib/format';
import { Head, Link } from '@inertiajs/react';
import { AlertTriangle, PackagePlus } from 'lucide-react';

export default function InventoryPage({
    balances,
    expiringLots,
}: {
    balances: { data: Array<{ id: number; quantity_base: string; variant: { sku: string; product: { name: string; sku: string } } }> };
    expiringLots: Array<{ id: number; lot_number?: string; expiry_date: string; product_variant: { product: { name: string; sku: string } } }>;
}) {
    return (
        <AppLayout breadcrumbs={[{ title: 'Tồn kho', href: '/inventory' }]}>
            <Head title="Tồn kho" />
            <div className="space-y-4 p-4">
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
                {expiringLots.length > 0 && (
                    <div className="rounded-lg border border-orange-300 bg-orange-50 p-4">
                        <h2 className="mb-2 flex items-center font-semibold text-orange-900">
                            <AlertTriangle className="mr-2 size-5" />
                            Lô hết hạn hoặc sẽ hết hạn trong 7 ngày
                        </h2>
                        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                            {expiringLots.map((lot) => (
                                <div key={lot.id} className="rounded-md border border-orange-200 bg-white p-3 text-sm">
                                    <div className="font-semibold">{lot.product_variant.product.name}</div>
                                    <div className="text-slate-500">
                                        Lô {lot.lot_number || 'không mã'} · HSD {formatDate(lot.expiry_date)}
                                    </div>
                                    <Badge className="mt-2 bg-orange-100 text-orange-800">Chỉ cảnh báo, không chặn bán</Badge>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-left text-xs text-slate-500 uppercase">
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
            </div>
        </AppLayout>
    );
}
