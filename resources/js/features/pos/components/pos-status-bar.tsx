import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, FileText, Wifi, WifiOff } from 'lucide-react';
import type { Shift } from '../model/types';

export function PosStatusBar({
    online,
    pendingCount,
    activeShift,
    expiryAlerts,
    onOpenSync,
    hasLatestReceipt,
    onOpenLatestReceipt,
}: {
    online: boolean;
    pendingCount: number;
    activeShift: Shift | null;
    expiryAlerts: number;
    onOpenSync: () => void;
    hasLatestReceipt: boolean;
    onOpenLatestReceipt: () => void;
}) {
    return (
        <div className="bg-card mb-2 flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 shadow-sm" aria-live="polite">
            <div className="flex items-center gap-2 text-sm">
                <Badge className={online ? 'bg-success text-success-foreground' : 'bg-warning text-warning-foreground'}>
                    {online ? <Wifi className="mr-1 size-3" /> : <WifiOff className="mr-1 size-3" />}
                    {online ? 'Online' : 'Offline'}
                </Badge>
                <div className="min-w-0">
                    <div className="font-medium">{activeShift ? `${activeShift.code} · ${activeShift.register.name}` : 'Chưa mở ca'}</div>
                    {activeShift && (
                        <div className="text-muted-foreground text-xs">
                            Mở{' '}
                            {activeShift.opened_at
                                ? new Date(activeShift.opened_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
                                : '—'}
                            {activeShift.opened_by?.name ? ` · ${activeShift.opened_by.name}` : ''}
                        </div>
                    )}
                </div>
            </div>
            <div className="text-muted-foreground flex items-center gap-2 text-xs">
                {hasLatestReceipt && (
                    <Button size="sm" variant="outline" onClick={onOpenLatestReceipt} aria-label="Mở và in lại hóa đơn gần nhất">
                        <FileText className="mr-1 size-3.5" />
                        Hóa đơn gần nhất
                    </Button>
                )}
                {pendingCount > 0 && (
                    <Button size="sm" variant="outline" onClick={onOpenSync} aria-label={`Mở trung tâm đồng bộ, ${pendingCount} hóa đơn đang chờ`}>
                        Xem đồng bộ ({pendingCount})
                    </Button>
                )}
                F3 tìm · F8 xóa giỏ · F9 tiền đủ · F12 thanh toán
                {expiryAlerts > 0 && (
                    <Badge className="bg-warning-muted text-warning-foreground">
                        <AlertTriangle className="mr-1 size-3" />
                        {expiryAlerts} lô cận/hết hạn
                    </Badge>
                )}
            </div>
        </div>
    );
}
