import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDateTime, formatMoney } from '@/lib/format';
import { ArrowDownToLine, LockKeyhole } from 'lucide-react';
import type { Shift } from '../model/types';

export function ShiftTable({
    shifts,
    onCashMovement,
    onClose,
    onReconcile,
}: {
    shifts: Shift[];
    onCashMovement: (id: number) => void;
    onClose: (id: number) => void;
    onReconcile: (id: number) => void;
}) {
    return (
        <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
            <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs text-slate-500 uppercase">
                    <tr>
                        <th className="px-4 py-3">Ca / quầy</th>
                        <th className="px-4 py-3">Mở lúc</th>
                        <th className="px-4 py-3 text-right">Đầu ca</th>
                        <th className="px-4 py-3 text-right">Theo hệ thống</th>
                        <th className="px-4 py-3 text-right">Thực đếm / lệch</th>
                        <th className="px-4 py-3">Trạng thái</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    {shifts.map((shift) => (
                        <tr key={shift.id} className="border-t">
                            <td className="px-4 py-3">
                                <div className="font-semibold">{shift.code}</div>
                                <div className="text-xs text-slate-500">{shift.register.name}</div>
                            </td>
                            <td className="px-4">{formatDateTime(shift.opened_at)}</td>
                            <td className="px-4 text-right">{formatMoney(shift.opening_cash)}đ</td>
                            <td className="px-4 text-right">{shift.expected_cash == null ? '—' : `${formatMoney(shift.expected_cash)}đ`}</td>
                            <td className="px-4 text-right">
                                {shift.actual_cash == null ? (
                                    '—'
                                ) : (
                                    <>
                                        <div>{formatMoney(shift.actual_cash)}đ</div>
                                        <div className={Number(shift.difference_cash) === 0 ? 'text-emerald-600' : 'text-red-600'}>
                                            {Number(shift.difference_cash) > 0 ? '+' : ''}
                                            {formatMoney(shift.difference_cash ?? 0)}đ
                                        </div>
                                    </>
                                )}
                            </td>
                            <td className="px-4">
                                {shift.needs_reconciliation && <Badge className="bg-amber-100 text-amber-900">Cần đối soát</Badge>}
                                {shift.status === 'open' ? (
                                    <Badge className="bg-emerald-100 text-emerald-800">Đang mở</Badge>
                                ) : (
                                    <Badge variant="outline">Đã đóng</Badge>
                                )}
                            </td>
                            <td className="px-4">
                                <div className="flex justify-end gap-1">
                                    {shift.status === 'open' && (
                                        <>
                                            <Button size="sm" variant="outline" onClick={() => onCashMovement(shift.id)}>
                                                <ArrowDownToLine className="mr-1 size-3" />
                                                Thu/chi
                                            </Button>
                                            <Button size="sm" variant="outline" onClick={() => onClose(shift.id)}>
                                                <LockKeyhole className="mr-1 size-3" />
                                                Chốt ca
                                            </Button>
                                        </>
                                    )}
                                    {shift.needs_reconciliation && (
                                        <Button size="sm" variant="outline" onClick={() => onReconcile(shift.id)}>
                                            Đối soát
                                        </Button>
                                    )}
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
