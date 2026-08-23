import { useOrganizationTimezone } from '@/hooks/use-organization-timezone';
import { formatDateTime, formatQuantity } from '@/lib/format';
import { FileSpreadsheet } from 'lucide-react';

export function StockReceiptHistory({
    receipts,
}: {
    receipts: Array<{ id: number; receipt_number: string; source: string; supplier_name?: string; items_count: number; received_at: string }>;
}) {
    const timezone = useOrganizationTimezone();

    return (
        <div className="bg-card overflow-hidden rounded-lg border shadow-sm">
            <div className="flex items-center gap-2 border-b px-4 py-3 font-semibold">
                <FileSpreadsheet className="size-4" />
                Lịch sử nhập kho
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-muted text-muted-foreground text-left text-xs uppercase">
                        <tr>
                            <th className="px-4 py-2">Mã phiếu</th>
                            <th className="px-4 py-2">Thời gian</th>
                            <th className="px-4 py-2">Nguồn</th>
                            <th className="px-4 py-2">Ghi chú nhà cung cấp</th>
                            <th className="px-4 py-2 text-right">Số lượng</th>
                        </tr>
                    </thead>
                    <tbody>
                        {receipts.map((receipt) => (
                            <tr key={receipt.id} className="border-t">
                                <td className="px-4 py-3 font-medium">{receipt.receipt_number}</td>
                                <td className="px-4">{formatDateTime(receipt.received_at, timezone)}</td>
                                <td className="px-4">{receipt.source === 'excel' ? 'Excel' : 'Nhập tay'}</td>
                                <td className="px-4">{receipt.supplier_name ?? '—'}</td>
                                <td className="px-4 text-right">{formatQuantity(receipt.items_count)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
