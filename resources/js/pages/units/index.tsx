import { CollectionState, FieldError, FilterBar, FormErrorSummary, PageHeader, Pagination, SearchField } from '@/components/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { useListQuery } from '@/hooks/use-list-query';
import AppLayout from '@/layouts/app-layout';
import type { Paginated } from '@/types/pagination';
import { Head, useForm } from '@inertiajs/react';
import { Pencil, Plus, Ruler } from 'lucide-react';
import { useState, type FormEvent } from 'react';

type Unit = { id: number; code: string; name: string; is_active: boolean; product_units_count: number };
type Filters = { search: string; status: string; per_page: number; page: number };
type FormData = { code: string; name: string; is_active: boolean };

export default function UnitsPage({
    units,
    filters,
    canManageCatalog,
}: {
    units: Paginated<Unit>;
    filters: Omit<Filters, 'page'>;
    canManageCatalog: boolean;
}) {
    const { query, update, reset, isLoading, error, retry } = useListQuery<Filters>(route('units.index'), { ...filters, page: 1 });
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<Unit | null>(null);
    const form = useForm<FormData>({ code: '', name: '', is_active: true });
    const hasFilters = Boolean(query.search || query.status !== 'all');
    const openCreate = () => {
        setEditing(null);
        form.setData({ code: '', name: '', is_active: true });
        form.clearErrors();
        setOpen(true);
    };
    const openEdit = (unit: Unit) => {
        setEditing(unit);
        form.setData({ code: unit.code, name: unit.name, is_active: unit.is_active });
        form.clearErrors();
        setOpen(true);
    };
    const submit = (event: FormEvent) => {
        event.preventDefault();
        const options = {
            onSuccess: () => {
                setOpen(false);
                form.reset();
            },
        };
        if (editing) form.put(route('units.update', editing.id), options);
        else form.post(route('units.store'), options);
    };

    return (
        <AppLayout breadcrumbs={[{ title: 'Đơn vị', href: route('units.index') }]}>
            <Head title="Đơn vị" />
            <div className="flex flex-col gap-4 p-4 md:p-5 lg:p-6">
                <PageHeader
                    title="Đơn vị tính"
                    description="Đơn vị dùng chung; hệ số quy đổi nằm ở từng sản phẩm."
                    actions={
                        canManageCatalog ? (
                            <Button onClick={openCreate}>
                                <Plus />
                                Thêm đơn vị
                            </Button>
                        ) : undefined
                    }
                />
                <FilterBar>
                    <SearchField value={query.search} onChange={(value) => update('search', value)} placeholder="Tìm tên hoặc mã đơn vị…" />
                    <NativeSelect value={query.status} onChange={(event) => update('status', event.target.value)} aria-label="Lọc trạng thái">
                        <option value="all">Tất cả trạng thái</option>
                        <option value="active">Đang dùng</option>
                        <option value="inactive">Ngừng dùng</option>
                    </NativeSelect>
                </FilterBar>
                <div className="bg-card overflow-hidden rounded-lg border shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-muted text-muted-foreground text-left text-xs uppercase">
                                <tr>
                                    <th className="px-4 py-3">Mã</th>
                                    <th className="px-4 py-3">Tên</th>
                                    <th className="px-4 py-3 text-right">Sản phẩm sử dụng</th>
                                    <th className="px-4 py-3">Trạng thái</th>
                                    <th className="px-4 py-3 text-right">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {units.data.map((unit) => (
                                    <tr key={unit.id} className="hover:bg-muted/50 border-t">
                                        <td className="px-4 py-3 font-mono text-xs">{unit.code}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2 font-medium">
                                                <Ruler className="text-muted-foreground size-4" />
                                                {unit.name}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-right">{unit.product_units_count}</td>
                                        <td className="px-4 py-3">
                                            {unit.is_active ? <Badge>Đang dùng</Badge> : <Badge variant="outline">Ngừng dùng</Badge>}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            {canManageCatalog && (
                                                <Button size="sm" variant="ghost" onClick={() => openEdit(unit)}>
                                                    <Pencil className="mr-1 size-3" />
                                                    Sửa
                                                </Button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <CollectionState
                        isEmpty={!units.data.length}
                        hasFilters={hasFilters}
                        onReset={reset}
                        error={error}
                        onRetry={retry}
                        isLoading={isLoading}
                        label="đơn vị"
                    />
                    <Pagination paginator={units} routeUrl={route('units.index')} query={query} />
                </div>
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editing ? 'Sửa đơn vị' : 'Thêm đơn vị'}</DialogTitle>
                        <DialogDescription>Không xóa đơn vị đã được sản phẩm sử dụng.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={submit} className="flex flex-col gap-4">
                        <FormErrorSummary errors={form.errors} />
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="unit-code">Mã</Label>
                            <Input
                                id="unit-code"
                                value={form.data.code}
                                onChange={(event) => form.setData('code', event.target.value)}
                                aria-invalid={form.errors.code ? true : undefined}
                                aria-describedby={form.errors.code ? 'unit-code-error' : undefined}
                                required
                            />
                            <FieldError id="unit-code-error" message={form.errors.code} />
                        </div>
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="unit-name">Tên</Label>
                            <Input
                                id="unit-name"
                                value={form.data.name}
                                onChange={(event) => form.setData('name', event.target.value)}
                                aria-invalid={form.errors.name ? true : undefined}
                                aria-describedby={form.errors.name ? 'unit-name-error' : undefined}
                                required
                            />
                            <FieldError id="unit-name-error" message={form.errors.name} />
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                            <Checkbox
                                id="unit-is-active"
                                checked={form.data.is_active}
                                onCheckedChange={(checked) => form.setData('is_active', checked === true)}
                            />
                            <Label htmlFor="unit-is-active">Đang sử dụng</Label>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                                Hủy
                            </Button>
                            <Button type="submit" disabled={form.processing}>
                                {form.processing ? 'Đang lưu…' : 'Lưu'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
