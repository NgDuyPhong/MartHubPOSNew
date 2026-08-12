import { formatDateTime, formatQuantity } from '@/lib/format';
import { FileSpreadsheet } from 'lucide-react';

export function StockReceiptHistory({
    receipts,
}: {
    receipts: Array<{ id: number; receipt_number: string; source: string; supplier_name?: string; items_count: number; received_at: string }>;
}) {
    return (
        <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b px-4 py-3 font-semibold">
                <FileSpreadsheet className="size-4" />
                Lịch sử nhập kho
            </div>
            <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs text-slate-500 uppercase">
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
                            <td className="px-4">{formatDateTime(receipt.received_at)}</td>
                            <td className="px-4">{receipt.source === 'excel' ? 'Excel' : 'Nhập tay'}</td>
                            <td className="px-4">{receipt.supplier_name ?? '—'}</td>
                            <td className="px-4 text-right">{formatQuantity(receipt.items_count)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
