import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { Product } from '../model/types';

export function ProductStatusDialog({
    product,
    open,
    processing,
    onOpenChange,
    onConfirm,
}: {
    product: Product | null;
    open: boolean;
    processing: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
}) {
    if (!product) return null;
    const activate = !product.is_active;
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{activate ? 'Bán lại sản phẩm?' : 'Ngừng bán sản phẩm?'}</DialogTitle>
                    <DialogDescription>
                        {activate
                            ? `${product.name} sẽ xuất hiện lại trong catalog POS nếu có đơn vị bán mặc định hợp lệ.`
                            : `${product.name} sẽ không còn trong catalog POS sau lần làm mới tiếp theo. Tồn kho, lô và lịch sử bán không bị xóa.`}
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                        Hủy
                    </Button>
                    <Button type="button" variant={activate ? 'default' : 'destructive'} disabled={processing} onClick={onConfirm}>
                        {processing ? 'Đang cập nhật…' : activate ? 'Bán lại' : 'Ngừng bán'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
