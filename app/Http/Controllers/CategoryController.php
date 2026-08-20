<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreCategoryRequest;
use App\Models\Category;
use App\Services\ResourceVersionService;
use App\Support\VietnameseSearch;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class CategoryController extends Controller
{
    public function __construct(private readonly ResourceVersionService $resourceVersions) {}

    public function index(Request $request): Response
    {
        $organizationId = $request->user()->organization_id;
        $search = trim((string) $request->string('search'));
        $normalizedSearch = VietnameseSearch::normalize($search);
        $status = $request->string('status')->toString() ?: 'active';
        $parentId = $request->integer('parent_id') ?: null;
        $perPage = in_array($request->integer('per_page'), config('ux.pagination.options'), true) ? $request->integer('per_page') : config('ux.pagination.default');

        $categories = Category::query()
            ->where('organization_id', $organizationId)
            ->when($normalizedSearch !== '', fn ($query) => $query->where('search_text', 'like', "%{$normalizedSearch}%"))
            ->when(in_array($status, ['active', 'inactive'], true), fn ($query) => $query->where('is_active', $status === 'active'))
            ->when($parentId, fn ($query) => $query->where('parent_id', $parentId))
            ->with('parent:id,name')
            ->withCount(['products', 'children'])
            ->orderBy('sort_order')
            ->orderBy('name')
            ->paginate($perPage)
            ->withQueryString();

        return Inertia::render('categories/index', [
            'categories' => $categories,
            'parentOptions' => Category::query()->where('organization_id', $organizationId)->orderBy('name')->get(['id', 'name', 'parent_id']),
            'filters' => ['search' => $search, 'status' => $status, 'parent_id' => $parentId, 'per_page' => $perPage],
            'canManageCatalog' => $request->user()->canManageCatalog(),
        ]);
    }

    public function store(StoreCategoryRequest $request): RedirectResponse
    {
        $data = $request->validated();
        DB::transaction(function () use ($data, $request): void {
            Category::query()->create([
                ...$data,
                'organization_id' => $request->user()->organization_id,
                'code' => $data['code'] ?: str($data['name'])->slug('-')->toString(),
            ]);
            $this->resourceVersions->bumpAfterCommit($request->user(), ['catalog']);
        });

        return back()->with('success', 'Đã tạo danh mục.');
    }

    public function update(StoreCategoryRequest $request, Category $category): RedirectResponse
    {
        abort_unless($category->organization_id === $request->user()->organization_id, 403);
        $data = $request->validated();
        abort_if(($data['is_active'] ?? true) === false && $category->children()->where('is_active', true)->exists(), 409, 'Hãy ngừng sử dụng danh mục con trước khi ngừng danh mục cha.');
        DB::transaction(function () use ($category, $data, $request): void {
            $category->update($data);
            $this->resourceVersions->bumpAfterCommit($request->user(), ['catalog']);
        });

        return back()->with('success', 'Đã cập nhật danh mục.');
    }

    public function destroy(Request $request, Category $category): RedirectResponse
    {
        abort_unless($category->organization_id === $request->user()->organization_id && $request->user()->canManageCatalog(), 403);
        abort_if($category->products()->exists() || $category->children()->exists(), 409, 'Danh mục đang được sử dụng. Hãy ngừng sử dụng thay vì xóa.');
        DB::transaction(function () use ($category, $request): void {
            $category->delete();
            $this->resourceVersions->bumpAfterCommit($request->user(), ['catalog']);
        });

        return back()->with('success', 'Đã xóa danh mục.');
    }
}
