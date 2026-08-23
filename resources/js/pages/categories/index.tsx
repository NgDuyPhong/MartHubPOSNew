import { CollectionState, FieldError, FilterBar, FormErrorSummary, PageHeader, Pagination, SearchField } from '@/components/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { useListQuery } from '@/hooks/use-list-query';
import AppLayout from '@/layouts/app-layout';
import type { Paginated } from '@/types/pagination';
import { Head, useForm } from '@inertiajs/react';
import { FolderTree, Pencil, Plus, Power } from 'lucide-react';
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
    sort_order?: number;
    parent?: { id: number; name: string };
};

type Filters = { search: string; status: string; parent_id: number | null; per_page: number; page: number };
type FormData = { name: string; code: string; description: string; color: string; parent_id: number | ''; sort_order: number; is_active: boolean };
type StatusFormData = Omit<FormData, 'parent_id'> & { parent_id: number | null };
type ParentOption = { id: number; name: string; parent_id: number | null };

function getCategoryPath(option: ParentOption, optionsById: Map<number, ParentOption>, trail = new Set<number>()): string {
    if (trail.has(option.id) || option.parent_id === null) return option.name;

    const parent = optionsById.get(option.parent_id);
    if (!parent) return option.name;

    return `${getCategoryPath(parent, optionsById, new Set(trail).add(option.id))} / ${option.name}`;
}

function getCategoryOptions(options: ParentOption[]) {
    const optionsById = new Map(options.map((option) => [option.id, option]));

    return options.map((option) => {
        const path = getCategoryPath(option, optionsById);

        return { value: String(option.id), label: path, searchText: path };
    });
}

function getDescendantIds(options: ParentOption[], categoryId: number | null): Set<number> {
    const descendants = new Set<number>();
    if (categoryId === null) return descendants;

    const pending = [categoryId];
    while (pending.length > 0) {
        const parentId = pending.pop();
        if (parentId === undefined) continue;

        options.forEach((option) => {
            if (option.parent_id === parentId && !descendants.has(option.id)) {
                descendants.add(option.id);
                pending.push(option.id);
            }
        });
    }

    return descendants;
}

export default function CategoriesPage({
    categories,
    parentOptions,
    filters,
    canManageCatalog,
}: {
    categories: Paginated<Category>;
    parentOptions: ParentOption[];
    filters: Omit<Filters, 'page'>;
    canManageCatalog: boolean;
}) {
    const { query, update, reset, isLoading, error, retry } = useListQuery<Filters>(route('categories.index'), {
        ...filters,
        status: filters.status || 'active',
        page: 1,
    });
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<Category | null>(null);
    const [statusCategory, setStatusCategory] = useState<Category | null>(null);
    const form = useForm<FormData>({ name: '', code: '', description: '', color: '', parent_id: '', sort_order: 0, is_active: true });
    const statusForm = useForm<StatusFormData>({ name: '', code: '', description: '', color: '', parent_id: null, sort_order: 0, is_active: false });
    const hasFilters = Boolean(query.search || query.parent_id || query.status !== 'active');
    const parentCategoryOptions = getCategoryOptions(parentOptions);
    const invalidParentIds = getDescendantIds(parentOptions, editing?.id ?? null);
    if (editing) invalidParentIds.add(editing.id);
    const selectableParentOptions = parentCategoryOptions.filter((option) => !invalidParentIds.has(Number(option.value)));

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
        const options = {
            onSuccess: () => {
                setOpen(false);
                form.reset();
            },
        };
        if (editing) form.put(route('categories.update', editing.id), options);
        else form.post(route('categories.store'), options);
    };

    const confirmStatus = () => {
        if (!statusCategory) return;

        const category = statusCategory;
        statusForm.transform(() => ({
            name: category.name,
            code: category.code ?? '',
            description: category.description ?? '',
            color: category.color ?? '',
            parent_id: category.parent_id,
            sort_order: category.sort_order ?? 0,
            is_active: !category.is_active,
        }));
        statusForm.put(route('categories.update', category.id), {
            preserveScroll: true,
            onSuccess: () => {
                setStatusCategory(null);
                statusForm.reset();
            },
        });
    };

    return (
        <AppLayout breadcrumbs={[{ title: 'Danh mục', href: route('categories.index') }]}>
            <Head title="Danh mục" />
            <div className="flex flex-col gap-4 p-4 md:p-5 lg:p-6">
                <PageHeader
                    title="Danh mục sản phẩm"
                    description="Quản lý cây danh mục, trạng thái và số sản phẩm đang sử dụng."
                    actions={
                        canManageCatalog ? (
                            <Button onClick={openCreate}>
                                <Plus />
                                Thêm danh mục
                            </Button>
                        ) : undefined
                    }
                />
                <FilterBar>
                    <SearchField value={query.search} onChange={(value) => update('search', value)} placeholder="Tìm tên hoặc mã danh mục…" />
                    <NativeSelect value={query.status} onChange={(event) => update('status', event.target.value)} aria-label="Lọc trạng thái">
                        <option value="all">Tất cả trạng thái</option>
                        <option value="active">Đang dùng</option>
                        <option value="inactive">Ngừng dùng</option>
                    </NativeSelect>
                    <SearchableSelect
                        value={query.parent_id === null ? null : String(query.parent_id)}
                        options={parentCategoryOptions}
                        onValueChange={(value) => update('parent_id', value ? Number(value) : null)}
                        placeholder="Tất cả cấp"
                        searchPlaceholder="Tìm danh mục cha…"
                        emptyText="Không tìm thấy danh mục cha."
                        aria-label="Lọc danh mục cha"
                        clearable
                        className="md:min-w-56"
                    />
                </FilterBar>
                <div className="bg-card overflow-hidden rounded-lg border">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-muted text-muted-foreground text-left text-xs uppercase">
                                <tr>
                                    <th className="px-4 py-3">Danh mục</th>
                                    <th className="px-4 py-3">Mã</th>
                                    <th className="px-4 py-3">Danh mục cha</th>
                                    <th className="px-4 py-3 text-right">Sản phẩm</th>
                                    <th className="px-4 py-3">Trạng thái</th>
                                    <th className="px-4 py-3 text-right">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {categories.data.map((category) => (
                                    <tr key={category.id} className="hover:bg-muted/50 border-t">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2 font-medium">
                                                <FolderTree className="text-muted-foreground size-4" />
                                                {category.name}
                                            </div>
                                            <div className="text-muted-foreground text-xs">{category.description || 'Không có mô tả'}</div>
                                        </td>
                                        <td className="px-4 py-3 font-mono text-xs">{category.code || '—'}</td>
                                        <td className="px-4 py-3">{category.parent?.name ?? 'Gốc'}</td>
                                        <td className="px-4 py-3 text-right">{category.products_count}</td>
                                        <td className="px-4 py-3">
                                            {category.is_active ? <Badge>Đang dùng</Badge> : <Badge variant="outline">Ngừng dùng</Badge>}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            {canManageCatalog && (
                                                <div className="flex items-center justify-end gap-1">
                                                    <Button size="sm" variant="ghost" onClick={() => openEdit(category)}>
                                                        <Pencil className="mr-1 size-3" />
                                                        Sửa
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => setStatusCategory(category)}
                                                        aria-label={category.is_active ? `Ngừng dùng ${category.name}` : `Sử dụng ${category.name}`}
                                                    >
                                                        <Power />
                                                        {category.is_active ? 'Ngừng dùng' : 'Sử dụng'}
                                                    </Button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <CollectionState
                        isEmpty={!categories.data.length}
                        hasFilters={hasFilters}
                        onReset={reset}
                        error={error}
                        onRetry={retry}
                        isLoading={isLoading}
                        label="danh mục"
                    />
                    <Pagination paginator={categories} routeUrl={route('categories.index')} query={query} />
                </div>
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editing ? 'Sửa danh mục' : 'Thêm danh mục'}</DialogTitle>
                        <DialogDescription>Danh mục cha-con không được tạo vòng lặp.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={submit} className="flex flex-col gap-4">
                        <FormErrorSummary errors={form.errors} />
                        <div className="grid gap-3 sm:grid-cols-2">
                            <div className="flex flex-col gap-2">
                                <Label htmlFor="category-name">Tên</Label>
                                <Input
                                    id="category-name"
                                    value={form.data.name}
                                    onChange={(event) => form.setData('name', event.target.value)}
                                    aria-invalid={form.errors.name ? true : undefined}
                                    aria-describedby={form.errors.name ? 'category-name-error' : undefined}
                                    required
                                />
                                <FieldError id="category-name-error" message={form.errors.name} />
                            </div>
                            <div className="flex flex-col gap-2">
                                <Label htmlFor="category-code">Mã</Label>
                                <Input
                                    id="category-code"
                                    value={form.data.code}
                                    onChange={(event) => form.setData('code', event.target.value)}
                                    aria-invalid={form.errors.code ? true : undefined}
                                    aria-describedby={form.errors.code ? 'category-code-error' : undefined}
                                    placeholder="tu-hoa"
                                />
                                <FieldError id="category-code-error" message={form.errors.code} />
                            </div>
                        </div>
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="category-parent">Danh mục cha</Label>
                            <SearchableSelect
                                id="category-parent"
                                value={form.data.parent_id === '' ? null : String(form.data.parent_id)}
                                options={selectableParentOptions}
                                onValueChange={(value) => form.setData('parent_id', value ? Number(value) : '')}
                                placeholder="Danh mục gốc"
                                searchPlaceholder="Tìm danh mục cha…"
                                emptyText="Không tìm thấy danh mục cha hợp lệ."
                                invalid={Boolean(form.errors.parent_id)}
                                aria-describedby="category-parent-error"
                                clearable
                            />
                            <FieldError id="category-parent-error" message={form.errors.parent_id} />
                        </div>
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="category-description">Mô tả</Label>
                            <Input
                                id="category-description"
                                value={form.data.description}
                                onChange={(event) => form.setData('description', event.target.value)}
                            />
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                            <Checkbox
                                id="category-is-active"
                                checked={form.data.is_active}
                                onCheckedChange={(checked) => form.setData('is_active', checked === true)}
                            />
                            <Label htmlFor="category-is-active">Đang sử dụng</Label>
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
            <Dialog
                open={statusCategory !== null}
                onOpenChange={(nextOpen) => {
                    if (!nextOpen) setStatusCategory(null);
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{statusCategory?.is_active ? 'Ngừng dùng danh mục?' : 'Sử dụng danh mục?'}</DialogTitle>
                        <DialogDescription>
                            {statusCategory?.is_active
                                ? `${statusCategory.name} sẽ không còn được chọn trong các thao tác mới. Dữ liệu sản phẩm và lịch sử không bị xóa.`
                                : `${statusCategory?.name} sẽ được phép sử dụng lại trong các thao tác mới.`}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setStatusCategory(null)}>
                            Hủy
                        </Button>
                        <Button
                            type="button"
                            variant={statusCategory?.is_active ? 'destructive' : 'default'}
                            disabled={statusForm.processing}
                            onClick={confirmStatus}
                        >
                            {statusForm.processing ? 'Đang cập nhật…' : statusCategory?.is_active ? 'Ngừng dùng' : 'Sử dụng'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
