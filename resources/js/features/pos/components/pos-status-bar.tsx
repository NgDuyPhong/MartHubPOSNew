import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Wifi, WifiOff } from 'lucide-react';
import type { Shift } from '../model/types';

export function PosStatusBar({
    online,
    pendingCount,
    activeShift,
    expiryAlerts,
}: {
    online: boolean;
    pendingCount: number;
    activeShift: Shift | null;
    expiryAlerts: number;
}) {
    return (
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-white px-3 py-2 shadow-sm">
            <div className="flex items-center gap-2 text-sm">
                <Badge className={online ? 'bg-emerald-600' : 'bg-amber-600'}>
                    {online ? <Wifi className="mr-1 size-3" /> : <WifiOff className="mr-1 size-3" />}
                    {online ? 'Online' : 'Offline'}
                </Badge>
                <span className="font-medium">{activeShift ? `${activeShift.code} · ${activeShift.register.name}` : 'Chưa mở ca'}</span>
                {pendingCount > 0 && <Badge variant="outline">{pendingCount} HĐ chờ đồng bộ</Badge>}
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
                F3 tìm · F8 xóa giỏ · F9 tiền đủ · F12 thanh toán
                {expiryAlerts > 0 && (
                    <Badge className="bg-orange-100 text-orange-800">
                        <AlertTriangle className="mr-1 size-3" />
                        {expiryAlerts} lô cận/hết hạn
                    </Badge>
                )}
            </div>
        </div>
    );
}
