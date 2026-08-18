import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertTriangle, CheckCircle2, Download, LoaderCircle, RefreshCw, WifiOff } from 'lucide-react';
import type { PendingSale } from '../api/offline-sale-repository';

const statusLabels = { pending: 'Đang chờ', syncing: 'Đang đồng bộ', failed: 'Có thể thử lại', conflict: 'Cần xử lý' } as const;

export function SyncCenter({
    open,
    onOpenChange,
    online,
    records,
    onSync,
    onRetry,
    onExport,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    online: boolean;
    records: PendingSale[];
    onSync: () => void;
    onRetry: (idempotencyKey: string) => void;
    onExport: () => void;
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Trung tâm đồng bộ offline</DialogTitle>
                    <DialogDescription>Hóa đơn được giữ nguyên idempotency key và ca gốc. Conflict không tự chuyển sang ca mới.</DialogDescription>
                </DialogHeader>
                <div className="flex max-h-[55vh] flex-col gap-2 overflow-y-auto">
                    {!records.length && (
                        <p className="text-muted-foreground rounded-md border border-dashed p-6 text-center text-sm">Không có hóa đơn đang chờ.</p>
                    )}
                    {records.map((record) => (
                        <div key={record.idempotency_key} className="flex items-start justify-between gap-3 rounded-md border p-3 text-sm">
                            <div className="flex min-w-0 items-start gap-2">
                                {record.status === 'syncing' ? (
                                    <LoaderCircle className="mt-0.5 size-4 animate-spin" />
                                ) : record.status === 'conflict' ? (
                                    <AlertTriangle className="text-destructive mt-0.5 size-4" />
                                ) : record.status === 'failed' ? (
                                    <WifiOff className="mt-0.5 size-4" />
                                ) : (
                                    <CheckCircle2 className="mt-0.5 size-4" />
                                )}
                                <div className="min-w-0">
                                    <p className="font-medium">
                                        {statusLabels[record.status]} · ca #{record.payload.shift_id}
                                    </p>
                                    <p className="text-muted-foreground truncate text-xs">
                                        {record.idempotency_key} · lần thử {record.attempts}
                                    </p>
                                    {record.last_error_message && <p className="text-destructive mt-1 text-xs">{record.last_error_message}</p>}
                                </div>
                            </div>
                            {record.status === 'failed' && online && (
                                <Button size="sm" variant="outline" onClick={() => onRetry(record.idempotency_key)}>
                                    <RefreshCw className="mr-1 size-3" />
                                    Thử lại
                                </Button>
                            )}
                        </div>
                    ))}
                </div>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={onExport}>
                        <Download className="mr-1 size-4" />
                        Xuất recovery JSON
                    </Button>
                    <Button type="button" onClick={onSync} disabled={!online || !records.length}>
                        <RefreshCw className="mr-1 size-4" />
                        Đồng bộ ngay
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
