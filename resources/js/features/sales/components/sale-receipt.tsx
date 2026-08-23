import { Badge } from '@/components/ui/badge';
import { useOrganizationTimezone } from '@/hooks/use-organization-timezone';
import { formatDateTime, formatMoney } from '@/lib/format';
import type { SaleItem } from '../model/types';

export function SaleReceipt({
    sale,
}: {
    sale: { sold_at: string; source: string; subtotal: number; discount_amount: number; total: number; debt_amount: number; items: SaleItem[] };
}) {
    const timezone = useOrganizationTimezone();

    return (
        <div data-receipt className="bg-card overflow-hidden rounded-lg border shadow-sm print:bg-white print:text-black">
            <div className="flex items-center justify-between border-b px-4 py-3">
                <div>
                    <div className="font-bold">MART HUB MINI MART</div>
                    <div className="text-muted-foreground text-xs print:text-slate-500">
                        Hóa đơn snapshot · {formatDateTime(sale.sold_at, timezone)}
                    </div>
                </div>
                <Badge variant="outline">{sale.source === 'offline_sync' ? 'Offline đã đồng bộ' : 'Online'}</Badge>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-muted text-muted-foreground text-left text-xs uppercase print:bg-white print:text-slate-500">
                        <tr>
                            <th className="px-4 py-3">Sản phẩm</th>
                            <th className="px-4 py-3">Đơn vị</th>
                            <th className="px-4 py-3 text-right">SL</th>
                            <th className="px-4 py-3 text-right">Đơn giá</th>
                            <th className="px-4 py-3 text-right">Giảm</th>
                            <th className="px-4 py-3 text-right">Thành tiền</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sale.items.map((item) => (
                            <tr key={item.id} className="border-t">
                                <td className="px-4 py-3">
                                    <div className="font-semibold">{item.product_name}</div>
                                    <div className="text-muted-foreground text-xs print:text-slate-500">
                                        {item.product_sku}
                                        {item.variant_name ? ` · ${item.variant_name}` : ''}
                                        {item.price_overridden ? ' · Đã sửa giá (có duyệt)' : ''}
                                    </div>
                                </td>
                                <td className="px-4">
                                    {item.quantity} {item.unit_name}
                                </td>
                                <td className="px-4 text-right">{Number(item.quantity)}</td>
                                <td className="px-4 text-right">{formatMoney(item.unit_price)}đ</td>
                                <td className="text-warning px-4 text-right">{formatMoney(item.discount_amount)}đ</td>
                                <td className="px-4 text-right font-bold">{formatMoney(item.line_total)}đ</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="ml-auto w-full max-w-sm space-y-2 border-t p-4 text-sm">
                <div className="flex justify-between">
                    <span>Tạm tính</span>
                    <span>{formatMoney(sale.subtotal)}đ</span>
                </div>
                <div className="flex justify-between">
                    <span>Giảm giá</span>
                    <span>-{formatMoney(sale.discount_amount)}đ</span>
                </div>
                <div className="flex justify-between text-lg font-bold">
                    <span>Tổng cộng</span>
                    <span>{formatMoney(sale.total)}đ</span>
                </div>
                <div className="text-destructive flex justify-between">
                    <span>Còn nợ</span>
                    <span>{formatMoney(sale.debt_amount)}đ</span>
                </div>
                {'paid_amount' in sale && (
                    <div className="flex justify-between">
                        <span>Đã thu</span>
                        <span>{formatMoney(sale.paid_amount as number)}đ</span>
                    </div>
                )}
                {'change_amount' in sale && (sale.change_amount as number) > 0 && (
                    <div className="flex justify-between">
                        <span>Tiền thừa</span>
                        <span>{formatMoney(sale.change_amount as number)}đ</span>
                    </div>
                )}
            </div>
        </div>
    );
}
