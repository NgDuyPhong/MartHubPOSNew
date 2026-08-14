import { CollectionState, Pagination, SearchField } from '@/components/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useListQuery } from '@/hooks/use-list-query';
import AppLayout from '@/layouts/app-layout';
import type { Paginated } from '@/types/pagination';
import { Head, useForm } from '@inertiajs/react';
import { FolderTree, Pencil, Plus } from 'lucide-react';
import { useState, type FormEvent } from 'react';

type Category = {
    id: number;
    name: string;
    code?: string;
    description?: string;
    color?: string;
    parent_id: number | null;
    is_active: boolean;
    products_count: number;
    children_count: number;
    parent?: { id: number; name: string };
};

type Filters = { search: string; status: string; parent_id: number | null; per_page: number; page: number };
type FormData = { name: string; code: string; description: string; color: string; parent_id: number | ''; sort_order: number; is_active: boolean };

export default function CategoriesPage({ categories, parentOptions, filters, canManageCatalog }: { categories: Paginated<Category>; parentOptions: Array<{ id: number; name: string; parent_id: number | null }>; filters: Omit<Filters, 'page'>; canManageCatalog: boolean }) {
    const { query, update, reset } = useListQuery<Filters>(route('categories.index'), { ...filters, page: 1 });
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<Category | null>(null);
    const form = useForm<FormData>({ name: '', code: '', description: '', color: '', parent_id: '', sort_order: 0, is_active: true });
    const hasFilters = Boolean(query.search || query.parent_id || query.status !== 'all');

    const openCreate = () => {
        setEditing(null);
        form.setData({ name: '', code: '', description: '', color: '', parent_id: '', sort_order: 0, is_active: true });
        form.clearErrors();
        setOpen(true);
    };

    const openEdit = (category: Category) => {
        setEditing(category);
        form.setData({
            name: category.name,
            code: category.code ?? '',
            description: category.description ?? '',
            color: category.color ?? '',
            parent_id: category.parent_id ?? '',
            sort_order: 0,
            is_active: category.is_active,
        });
        form.clearErrors();
        setOpen(true);
    };

    const submit = (event: FormEvent) => {
        event.preventDefault();
        const options = { onSuccess: () => { setOpen(false); form.reset(); } };
        if (editing) form.put(route('categories.update', editing.id), options);
        else form.post(route('categories.store'), options);
    };

    return (
        <AppLayout breadcrumbs={[{ title: 'Danh mục', href: route('categories.index') }]}>
            <Head title="Danh mục" />
            <div className="flex flex-col gap-4 p-4 md:p-5 lg:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-semibold">Danh mục sản phẩm</h1>
                        <p className="text-muted-foreground text-sm">Quản lý cây danh mục, trạng thái và số sản phẩm đang sử dụng.</p>
                    </div>
                    {canManageCatalog && <Button onClick={openCreate}><Plus className="mr-2 size-4" />Thêm danh mục</Button>}
                </div>
                <div className="flex flex-col gap-3 rounded-lg border bg-card p-3 shadow-sm md:flex-row md:items-center">
                    <SearchField value={query.search} onChange={(value) => update('search', value)} placeholder="Tìm tên hoặc mã danh mục…" />
                    <select className="bg-background h-10 rounded-md border px-3 text-sm" value={query.status} onChange={(event) => update('status', event.target.value)} aria-label="Lọc trạng thái">
                        <option value="all">Tất cả trạng thái</option><option value="active">Đang dùng</option><option value="inactive">Ngừng dùng</option>
                    </select>
                    <select className="bg-background h-10 rounded-md border px-3 text-sm" value={query.parent_id ?? ''} onChange={(event) => update('parent_id', event.target.value ? Number(event.target.value) : null)} aria-label="Lọc danh mục cha">
                        <option value="">Tất cả cấp</option>
                        {parentOptions.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
                    </select>
                </div>
                <div className="bg-card overflow-hidden rounded-lg border shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-muted text-muted-foreground text-left text-xs uppercase"><tr><th className="px-4 py-3">Danh mục</th><th className="px-4 py-3">Mã</th><th className="px-4 py-3">Danh mục cha</th><th className="px-4 py-3 text-right">Sản phẩm</th><th className="px-4 py-3">Trạng thái</th><th className="px-4 py-3 text-right">Thao tác</th></tr></thead>
                            <tbody>
                                {categories.data.map((category) => <tr key={category.id} className="hover:bg-muted/50 border-t"><td className="px-4 py-3"><div className="flex items-center gap-2 font-medium"><FolderTree className="text-muted-foreground size-4" />{category.name}</div><div className="text-muted-foreground text-xs">{category.description || 'Không có mô tả'}</div></td><td className="px-4 py-3 font-mono text-xs">{category.code || '—'}</td><td className="px-4 py-3">{category.parent?.name ?? 'Gốc'}</td><td className="px-4 py-3 text-right">{category.products_count}</td><td className="px-4 py-3">{category.is_active ? <Badge>Đang dùng</Badge> : <Badge variant="outline">Ngừng dùng</Badge>}</td><td className="px-4 py-3 text-right">{canManageCatalog && <Button size="sm" variant="ghost" onClick={() => openEdit(category)}><Pencil className="mr-1 size-3" />Sửa</Button>}</td></tr>)}
                            </tbody>
                        </table>
                    </div>
                    <CollectionState isEmpty={!categories.data.length} hasFilters={hasFilters} onReset={reset} label="danh mục" />
                    <Pagination paginator={categories} routeUrl={route('categories.index')} query={query} />
                </div>
            </div>
            <Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>{editing ? 'Sửa danh mục' : 'Thêm danh mục'}</DialogTitle><DialogDescription>Danh mục cha-con không được tạo vòng lặp.</DialogDescription></DialogHeader><form onSubmit={submit} className="flex flex-col gap-4"><div className="grid gap-3 sm:grid-cols-2"><div className="flex flex-col gap-2"><Label htmlFor="category-name">Tên</Label><Input id="category-name" value={form.data.name} onChange={(event) => form.setData('name', event.target.value)} required />{form.errors.name && <p className="text-destructive text-xs">{form.errors.name}</p>}</div><div className="flex flex-col gap-2"><Label htmlFor="category-code">Mã</Label><Input id="category-code" value={form.data.code} onChange={(event) => form.setData('code', event.target.value)} placeholder="tu-hoa" />{form.errors.code && <p className="text-destructive text-xs">{form.errors.code}</p>}</div></div><div className="flex flex-col gap-2"><Label htmlFor="category-parent">Danh mục cha</Label><select id="category-parent" className="bg-background h-10 rounded-md border px-3 text-sm" value={form.data.parent_id} onChange={(event) => form.setData('parent_id', event.target.value ? Number(event.target.value) : '')}><option value="">Danh mục gốc</option>{parentOptions.filter((option) => option.id !== editing?.id).map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select>{form.errors.parent_id && <p className="text-destructive text-xs">{form.errors.parent_id}</p>}</div><div className="flex flex-col gap-2"><Label htmlFor="category-description">Mô tả</Label><Input id="category-description" value={form.data.description} onChange={(event) => form.setData('description', event.target.value)} /></div><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.data.is_active} onChange={(event) => form.setData('is_active', event.target.checked)} />Đang sử dụng</label><DialogFooter><Button type="button" variant="outline" onClick={() => setOpen(false)}>Hủy</Button><Button type="submit" disabled={form.processing}>{form.processing ? 'Đang lưu…' : 'Lưu'}</Button></DialogFooter></form></DialogContent></Dialog>
        </AppLayout>
    );
}
