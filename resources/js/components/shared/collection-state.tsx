import { Button } from '@/components/ui/button';
import { AlertCircle, LoaderCircle, PackageOpen } from 'lucide-react';

export function CollectionState({
    isEmpty,
    hasFilters = false,
    onReset,
    onRetry,
    error,
    isLoading = false,
    label = 'bản ghi',
}: {
    isEmpty: boolean;
    hasFilters?: boolean;
    onReset?: () => void;
    onRetry?: () => void;
    error?: string | null;
    isLoading?: boolean;
    label?: string;
}) {
    if (error) {
        return (
            <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
                <AlertCircle className="text-destructive size-10" aria-hidden="true" />
                <div>
                    <h2 className="font-semibold">Không tải được dữ liệu</h2>
                    <p className="text-muted-foreground mt-1 text-sm">{error}</p>
                </div>
                {onRetry && (
                    <Button type="button" variant="outline" onClick={onRetry}>
                        Thử lại
                    </Button>
                )}
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="text-muted-foreground flex items-center justify-center gap-2 px-6 py-4 text-sm" role="status" aria-live="polite">
                <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                Đang cập nhật {label}…
            </div>
        );
    }

    if (!isEmpty) return null;

    return (
        <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <PackageOpen className="text-muted-foreground size-10" aria-hidden="true" />
            <div>
                <h2 className="font-semibold">{hasFilters ? `Không tìm thấy ${label} phù hợp` : `Chưa có ${label}`}</h2>
                <p className="text-muted-foreground mt-1 text-sm">
                    {hasFilters ? 'Thử đổi từ khóa hoặc xóa bộ lọc để xem thêm dữ liệu.' : 'Dữ liệu mới sẽ xuất hiện ở đây.'}
                </p>
            </div>
            {hasFilters && onReset && (
                <Button type="button" variant="outline" onClick={onReset}>
                    Xóa bộ lọc
                </Button>
            )}
        </div>
    );
}
