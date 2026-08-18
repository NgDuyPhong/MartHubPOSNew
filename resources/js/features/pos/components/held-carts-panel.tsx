import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { formatDateTime, formatMoney } from '@/lib/format';
import { Pause, Plus, ShoppingCart, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { CartDraft } from '../model/types';

function draftTotal(draft: CartDraft): number {
    return draft.cart.reduce((total, line) => total + Math.round(line.unitPrice * line.quantity) - line.discount, 0);
}

export function HeldCartsPanel({
    drafts,
    activeCartId,
    onNew,
    onSwitch,
    onRename,
    onHold,
    onDelete,
}: {
    drafts: CartDraft[];
    activeCartId: string | null;
    onNew: () => void;
    onSwitch: (id: string) => void;
    onRename: (id: string, name: string) => void;
    onHold: () => void;
    onDelete: (id: string) => void;
}) {
    const [open, setOpen] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [names, setNames] = useState<Record<string, string>>({});
    const heldDrafts = useMemo(() => drafts.filter((draft) => draft.id !== activeCartId), [activeCartId, drafts]);
    const activeDraft = drafts.find((draft) => draft.id === activeCartId);

    useEffect(() => {
        setNames(Object.fromEntries(drafts.map((draft) => [draft.id, draft.name])));
    }, [drafts]);

    const saveName = (draft: CartDraft) => {
        const nextName = names[draft.id]?.trim();
        if (nextName && nextName !== draft.name) onRename(draft.id, nextName);
    };

    return (
        <>
            <div className="bg-muted/20 flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2">
                <div className="flex min-w-0 items-center gap-2 text-sm">
                    <ShoppingCart className="text-muted-foreground size-4 shrink-0" />
                    <span className="text-muted-foreground shrink-0">Đơn hiện tại:</span>
                    <strong className="truncate">{activeDraft?.name ?? 'Đang tải…'}</strong>
                    {heldDrafts.length > 0 && <span className="text-muted-foreground shrink-0">· {heldDrafts.length} đơn đang giữ</span>}
                </div>
                <div className="flex shrink-0 gap-1">
                    <Button type="button" size="sm" variant="outline" onClick={onNew} aria-label="Tạo đơn mới">
                        <Plus className="mr-1 size-3.5" />
                        Đơn mới
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={onHold}
                        disabled={!activeDraft?.cart.length}
                        aria-label="Giữ đơn hiện tại"
                    >
                        <Pause className="mr-1 size-3.5" />
                        Giữ đơn
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(true)} disabled={!heldDrafts.length}>
                        Đổi đơn
                    </Button>
                </div>
            </div>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Đơn đang giữ</DialogTitle>
                        <DialogDescription>Chọn một đơn để tiếp tục. Dữ liệu cart, khách hàng và tiền đã nhập được giữ riêng.</DialogDescription>
                    </DialogHeader>
                    <div className="max-h-[min(60vh,32rem)] space-y-2 overflow-y-auto pr-1">
                        {heldDrafts.map((draft) => (
                            <div key={draft.id} className="bg-muted/30 flex flex-wrap items-center gap-3 rounded-md border p-3">
                                <button
                                    type="button"
                                    className="focus-visible:ring-ring min-w-0 flex-1 rounded text-left focus-visible:ring-2"
                                    onClick={() => {
                                        onSwitch(draft.id);
                                        setOpen(false);
                                    }}
                                >
                                    <span className="block truncate font-medium">{draft.name}</span>
                                    <span className="text-muted-foreground text-xs">
                                        {draft.cart.length} dòng · {formatMoney(draftTotal(draft))}đ · cập nhật {formatDateTime(draft.updatedAt)}
                                    </span>
                                </button>
                                <div className="flex min-w-[17rem] flex-1 items-center gap-2 sm:flex-none">
                                    <Input
                                        value={names[draft.id] ?? draft.name}
                                        aria-label={`Tên ${draft.name}`}
                                        onChange={(event) => setNames((current) => ({ ...current, [draft.id]: event.target.value }))}
                                        onKeyDown={(event) => {
                                            if (event.key === 'Enter') saveName(draft);
                                        }}
                                    />
                                    <Button type="button" size="sm" variant="outline" onClick={() => saveName(draft)}>
                                        Lưu tên
                                    </Button>
                                    <Button
                                        type="button"
                                        size="icon"
                                        variant="ghost"
                                        aria-label={`Xóa ${draft.name}`}
                                        onClick={() => setDeleteId(draft.id)}
                                    >
                                        <Trash2 className="size-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                            Đóng
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={deleteId !== null} onOpenChange={(nextOpen) => !nextOpen && setDeleteId(null)}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Xóa đơn đang giữ?</DialogTitle>
                        <DialogDescription>Cart và payment draft của đơn này sẽ bị xóa khỏi thiết bị.</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setDeleteId(null)}>
                            Hủy
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={() => {
                                if (deleteId) onDelete(deleteId);
                                setDeleteId(null);
                            }}
                        >
                            Xóa đơn
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
