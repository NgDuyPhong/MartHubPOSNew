import { Button } from '@/components/ui/button';

export function PosNotices({
    message,
    undoCartCount,
    hasStaleCartPrice,
    unavailableCartLineCount,
    onUndo,
    onDismiss,
}: {
    message: string | null;
    undoCartCount: number;
    hasStaleCartPrice: boolean;
    unavailableCartLineCount: number;
    onUndo: () => void;
    onDismiss: () => void;
}) {
    if (!message && !hasStaleCartPrice && unavailableCartLineCount === 0) {
        return null;
    }

    return (
        <div className="flex flex-col gap-2">
            {message && (
                <div
                    className="bg-info-muted text-info-foreground border-info/30 flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm"
                    role="status"
                >
                    <span className="min-w-0">{message}</span>
                    <div className="flex shrink-0 items-center gap-2">
                        {undoCartCount > 0 && (
                            <Button size="sm" variant="outline" onClick={onUndo}>
                                Hoàn tác
                            </Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={onDismiss}>
                            Đóng
                        </Button>
                    </div>
                </div>
            )}
            {hasStaleCartPrice && (
                <div className="bg-warning-muted text-warning-foreground border-warning/40 rounded-md border px-3 py-2 text-sm" role="status">
                    Giá catalog đã thay đổi; dòng hàng đang có trong giỏ vẫn giữ giá cũ. Sản phẩm thêm mới sẽ dùng giá hiện tại.
                </div>
            )}
            {unavailableCartLineCount > 0 && (
                <div className="bg-destructive/10 text-destructive border-destructive/30 rounded-md border px-3 py-2 text-sm" role="alert">
                    Có {unavailableCartLineCount} dòng hàng không còn khả dụng. Hãy xóa dòng đó và chọn sản phẩm khác trước khi thanh toán.
                </div>
            )}
        </div>
    );
}
