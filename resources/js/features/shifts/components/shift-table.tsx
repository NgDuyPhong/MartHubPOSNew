import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useOrganizationTimezone } from '@/hooks/use-organization-timezone';
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
    const timezone = useOrganizationTimezone();

    return (
        <div className="bg-card overflow-hidden rounded-lg border shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full min-w-max text-sm" aria-label="Danh sách ca và két">
                    <thead className="bg-muted text-muted-foreground text-left text-xs font-semibold tracking-wide uppercase">
                        <tr>
                            <th scope="col" className="px-4 py-3">
                                Ca / quầy
                            </th>
                            <th scope="col" className="px-4 py-3">
                                Mở lúc
                            </th>
                            <th scope="col" className="px-4 py-3 text-right">
                                Đầu ca
                            </th>
                            <th scope="col" className="px-4 py-3 text-right">
                                Theo hệ thống
                            </th>
                            <th scope="col" className="px-4 py-3 text-right">
                                Thực đếm / lệch
                            </th>
                            <th scope="col" className="px-4 py-3">
                                Trạng thái
                            </th>
                            <th scope="col" className="px-4 py-3 text-right">
                                <span className="sr-only">Thao tác</span>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {shifts.map((shift) => (
                            <tr key={shift.id} className="hover:bg-muted/50 border-t transition-colors">
                                <td className="px-4 py-3">
                                    <div className="font-semibold">{shift.code}</div>
                                    <div className="text-muted-foreground text-xs">{shift.register.name}</div>
                                </td>
                                <td className="px-4">{formatDateTime(shift.opened_at, timezone)}</td>
                                <td className="px-4 text-right">{formatMoney(shift.opening_cash)}đ</td>
                                <td className="px-4 text-right">{shift.expected_cash == null ? '—' : `${formatMoney(shift.expected_cash)}đ`}</td>
                                <td className="px-4 text-right">
                                    {shift.actual_cash == null ? (
                                        '—'
                                    ) : (
                                        <>
                                            <div>{formatMoney(shift.actual_cash)}đ</div>
                                            <div className={Number(shift.difference_cash) === 0 ? 'text-success' : 'text-destructive'}>
                                                {Number(shift.difference_cash) > 0 ? '+' : ''}
                                                {formatMoney(shift.difference_cash ?? 0)}đ
                                            </div>
                                        </>
                                    )}
                                </td>
                                <td className="px-4">
                                    {shift.needs_reconciliation && <Badge variant="warning">Cần đối soát</Badge>}
                                    {shift.status === 'open' ? <Badge variant="success">Đang mở</Badge> : <Badge variant="outline">Đã đóng</Badge>}
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
        </div>
    );
}
