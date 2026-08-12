import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { InertiaFormProps } from '@inertiajs/react';
import type { ProductFormData, Unit, UnitRow } from '../model/types';
import { ProductUnitsEditor } from './product-units-editor';

export function ProductFormDialog({
    open,
    editingId,
    form,
    categories,
    units,
    firstUnit,
    onOpenChange,
    onSubmit,
    updateUnit,
    chooseExclusive,
}: {
    open: boolean;
    editingId: number | null;
    form: InertiaFormProps<ProductFormData>;
    categories: Array<{ id: number; name: string }>;
    units: Unit[];
    firstUnit: number;
    onOpenChange: (open: boolean) => void;
    onSubmit: (event: React.FormEvent) => void;
    updateUnit: (index: number, values: Partial<UnitRow>) => void;
    chooseExclusive: (index: number, field: 'is_base' | 'is_default_sale') => void;
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{editingId ? 'Cập nhật sản phẩm' : 'Thêm sản phẩm'}</DialogTitle>
                    <DialogDescription>Khai báo đúng một đơn vị cơ sở. Ví dụ lon = 1, lốc = 6, thùng = 24.</DialogDescription>
                </DialogHeader>
                <form onSubmit={onSubmit} className="space-y-4">
                    <div className="grid gap-3 md:grid-cols-3">
                        <div>
                            <Label>Tên sản phẩm</Label>
                            <Input value={form.data.name} onChange={(event) => form.setData('name', event.target.value)} required />
                            {form.errors.name && <p className="text-xs text-red-600">{form.errors.name}</p>}
                        </div>
                        <div>
                            <Label>SKU</Label>
                            <Input value={form.data.sku} onChange={(event) => form.setData('sku', event.target.value)} required />
                        </div>
                        <div>
                            <Label>Danh mục</Label>
                            <select
                                className="h-10 w-full rounded-md border bg-white px-3"
                                value={form.data.category_id}
                                onChange={(event) => form.setData('category_id', event.target.value ? Number(event.target.value) : '')}
                            >
                                <option value="">Không phân loại</option>
                                {categories.map((category) => (
                                    <option key={category.id} value={category.id}>
                                        {category.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div>
                        <Label>Ảnh sản phẩm (tối đa 4 MB)</Label>
                        <Input type="file" accept="image/*" onChange={(event) => form.setData('image', event.target.files?.[0] ?? null)} />
                    </div>
                    <div className="flex gap-6 text-sm">
                        <label>
                            <input
                                type="checkbox"
                                className="mr-2"
                                checked={form.data.track_lot}
                                onChange={(event) => form.setData('track_lot', event.target.checked)}
                            />
                            Theo dõi lô
                        </label>
                        <label>
                            <input
                                type="checkbox"
                                className="mr-2"
                                checked={form.data.track_expiry}
                                onChange={(event) => form.setData('track_expiry', event.target.checked)}
                            />
                            Theo dõi hạn sử dụng
                        </label>
                    </div>
                    <ProductUnitsEditor form={form} units={units} firstUnit={firstUnit} updateUnit={updateUnit} chooseExclusive={chooseExclusive} />
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Hủy
                        </Button>
                        <Button type="submit" disabled={form.processing}>
                            {editingId ? 'Cập nhật' : 'Lưu sản phẩm'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
