<?php

namespace App\Http\Controllers;

use App\Http\Requests\QuickUpdateProductRequest;
use App\Http\Requests\StoreProductRequest;
use App\Http\Requests\UpdateProductStatusRequest;
use App\Models\ApprovalEvent;
use App\Models\Barcode;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductUnit;
use App\Models\Unit;
use App\Services\ProductImageService;
use App\Services\ResourceVersionService;
use App\Support\VietnameseSearch;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class ProductController extends Controller
{
    public function __construct(
        private readonly ResourceVersionService $resourceVersions,
        private readonly ProductImageService $productImages,
    ) {}

    public function index(Request $request): Response
    {
        $organizationId = $request->user()->organization_id;
        $search = trim((string) $request->string('search'));
        $normalizedSearch = VietnameseSearch::normalize($search);
        $categoryId = $request->integer('category_id') ?: null;
        $status = $request->string('status')->toString() ?: 'active';
        $sort = $request->string('sort')->toString() ?: 'latest';
        $direction = $request->string('direction')->toString() === 'asc' ? 'asc' : 'desc';
        $perPage = in_array($request->integer('per_page'), config('ux.pagination.options'), true)
            ? $request->integer('per_page')
            : config('ux.pagination.default');

        $products = Product::query()
            ->where('organization_id', $organizationId)
            ->when($normalizedSearch !== '', function ($query) use ($normalizedSearch, $search) {
                $query->where(function ($searchQuery) use ($normalizedSearch, $search) {
                    $searchQuery->where('search_text', 'like', "%{$normalizedSearch}%")
                        ->orWhere('sku', 'like', "%{$search}%")
                        ->orWhereHas('variants.units.barcodes', fn ($barcodeQuery) => $barcodeQuery->where('value', 'like', "%{$search}%"));
                });
            })
            ->when($categoryId, fn ($query) => $query->where('category_id', $categoryId))
            ->when(in_array($status, ['active', 'inactive'], true), fn ($query) => $query->where('is_active', $status === 'active'))
            ->with([
                'category:id,name',
                'variants' => fn ($query) => $query->with([
                    'units' => fn ($unitQuery) => $unitQuery->where('is_active', true)->with(['unit:id,code,name', 'barcodes:id,product_unit_id,value']),
                    'balances' => fn ($balanceQuery) => $balanceQuery->where('branch_id', $request->user()->branch_id)->whereNull('inventory_lot_id'),
                ]),
            ])
            ->when($sort === 'name', fn ($query) => $query->orderBy('name', $direction))
            ->when($sort === 'sku', fn ($query) => $query->orderBy('sku', $direction))
            ->when($sort === 'latest', fn ($query) => $query->orderBy('created_at', $direction))
            ->paginate($perPage)
            ->withQueryString();

        return Inertia::render('products/index', [
            'products' => $products,
            'categories' => Category::query()->where('organization_id', $organizationId)->where('is_active', true)->orderBy('name')->get(['id', 'name']),
            'units' => Unit::query()->where('organization_id', $organizationId)->where('is_active', true)->orderBy('name')->get(['id', 'code', 'name']),
            'filters' => [
                'search' => $search,
                'category_id' => $categoryId,
                'status' => $status,
                'sort' => $sort,
                'direction' => $direction,
                'per_page' => $perPage,
            ],
            'canManageCatalog' => $request->user()->canManageCatalog(),
        ]);
    }

    public function create(Request $request): Response
    {
        abort_unless($request->user()->canManageCatalog(), 403);

        return Inertia::render('products/create', $this->formOptions($request));
    }

    public function edit(Request $request, Product $product): Response
    {
        abort_unless($product->organization_id === $request->user()->organization_id, 403);
        abort_unless($request->user()->canManageCatalog(), 403);

        $product->load([
            'category:id,name',
            'variants' => fn ($query) => $query->with([
                'units' => fn ($unitQuery) => $unitQuery->with(['unit:id,code,name', 'barcodes:id,product_unit_id,value']),
            ]),
        ]);

        return Inertia::render('products/edit', [
            ...$this->formOptions($request),
            'product' => $product,
        ]);
    }

    public function updateStatus(UpdateProductStatusRequest $request, Product $product): RedirectResponse
    {
        abort_unless($product->organization_id === $request->user()->organization_id, 403);

        $updatedAt = Carbon::parse($request->validated('updated_at'));
        abort_unless($product->updated_at?->timestamp === $updatedAt->timestamp, 409, 'Sản phẩm đã được cập nhật ở nơi khác. Tải lại dữ liệu rồi thử lại.');

        $isActive = $request->boolean('is_active');
        if ($isActive) {
            $hasSellableUnit = $product->variants()
                ->where('is_active', true)
                ->whereHas('units', fn ($query) => $query->where('is_active', true)->where('is_default_sale', true))
                ->exists();
            abort_unless($hasSellableUnit, 422, 'Không thể bán lại: sản phẩm cần có biến thể và đơn vị bán mặc định đang hoạt động.');
        }

        DB::transaction(function () use ($product, $isActive, $request): void {
            $product->update(['is_active' => $isActive]);
            $this->resourceVersions->bumpAfterCommit($request->user(), ['catalog']);
        });

        return back()->with('success', $isActive ? 'Đã bán lại sản phẩm.' : 'Đã ngừng bán sản phẩm. Tồn kho và lịch sử vẫn được giữ nguyên.');
    }

    public function quickUpdate(QuickUpdateProductRequest $request, Product $product): RedirectResponse
    {
        abort_unless($product->organization_id === $request->user()->organization_id, 403);

        $product->load('variants');
        $requestedUpdatedAt = Carbon::parse($request->validated('updated_at'));
        abort_unless($product->updated_at?->timestamp === $requestedUpdatedAt->timestamp, 409, 'Sản phẩm đã được cập nhật ở nơi khác. Tải lại dữ liệu rồi thử lại.');

        $data = $request->validated();
        $productUnit = ProductUnit::query()
            ->whereKey($data['product_unit_id'])
            ->whereHas('variant', fn ($query) => $query->where('product_id', $product->id))
            ->firstOrFail();

        $before = ['name' => $product->name, 'category_id' => $product->category_id, 'sale_price' => $productUnit->sale_price];
        DB::transaction(function () use ($product, $productUnit, $data, $before, $request): void {
            $product->update([
                'name' => $data['name'],
                'category_id' => $data['category_id'] ?? null,
            ]);
            $productUnit->update(['sale_price' => $data['sale_price']]);
            ApprovalEvent::query()->create([
                'requested_by' => $request->user()->id,
                'approved_by' => $request->user()->id,
                'action' => 'catalog.quick_update',
                'approvable_type' => Product::class,
                'approvable_id' => $product->id,
                'status' => 'approved',
                'context' => ['source' => 'pos_quick_edit', 'before' => $before, 'after' => ['name' => $product->name, 'category_id' => $product->category_id, 'sale_price' => $productUnit->sale_price]],
            ]);
            $this->resourceVersions->bumpAfterCommit($request->user(), ['catalog']);
        });

        return back()->with('success', 'Đã cập nhật nhanh sản phẩm.');
    }

    public function store(StoreProductRequest $request): RedirectResponse
    {
        $data = $request->validated();
        $newImagePath = $data['image_action'] === 'upload'
            ? $this->productImages->store($request->file('image'), $request->user()->organization_id)
            : null;

        try {
            DB::transaction(function () use ($request, $data, $newImagePath): void {
                $product = Product::query()->create([
                    'organization_id' => $request->user()->organization_id,
                    'category_id' => $data['category_id'] ?? null,
                    'sku' => $data['sku'],
                    'name' => $data['name'],
                    'image_path' => $newImagePath,
                    'external_image_url' => $data['image_action'] === 'external' ? $data['external_image_url'] : null,
                    'track_lot' => $data['track_lot'] ?? false,
                    'track_expiry' => $data['track_expiry'] ?? false,
                    'is_active' => $data['is_active'] ?? true,
                ]);
                $variant = $product->variants()->create(['name' => 'Mặc định', 'sku' => $product->sku, 'last_cost_base' => 0, 'is_active' => true]);
                foreach ($data['units'] as $unitData) {
                    $productUnit = $variant->units()->create([
                        'unit_id' => $unitData['unit_id'],
                        'conversion_to_base' => $unitData['conversion_to_base'],
                        'sale_price' => $unitData['sale_price'],
                        'is_base' => $unitData['is_base'],
                        'is_default_sale' => $unitData['is_default_sale'],
                        'allows_fractional_quantity' => $unitData['allows_fractional_quantity'] ?? false,
                        'is_active' => true,
                    ]);
                    if ($unitData['barcode'] ?? null) {
                        Barcode::query()->create(['product_unit_id' => $productUnit->id, 'value' => $unitData['barcode'], 'is_primary' => true]);
                    }
                }
                $this->resourceVersions->bumpAfterCommit($request->user(), ['catalog']);
            });
        } catch (\Throwable $exception) {
            $this->productImages->delete($newImagePath);
            throw $exception;
        }

        return back()->with('success', 'Đã tạo sản phẩm và quy cách bán.');
    }

    public function update(StoreProductRequest $request, Product $product): RedirectResponse
    {
        abort_unless($product->organization_id === $request->user()->organization_id, 403);

        $data = $request->validated();
        $oldImagePath = $product->image_path;
        $newImagePath = $data['image_action'] === 'upload'
            ? $this->productImages->store($request->file('image'), $request->user()->organization_id)
            : null;

        try {
            DB::transaction(function () use ($request, $product, $data, $newImagePath): void {
                $product->update([
                    'category_id' => $data['category_id'] ?? null,
                    'sku' => $data['sku'],
                    'name' => $data['name'],
                    'track_lot' => $data['track_lot'] ?? false,
                    'track_expiry' => $data['track_expiry'] ?? false,
                    'is_active' => $data['is_active'] ?? true,
                    'image_path' => match ($data['image_action']) {
                        'upload' => $newImagePath,
                        'remove', 'external' => null,
                        default => $product->image_path,
                    },
                    'external_image_url' => $data['image_action'] === 'external' ? $data['external_image_url'] : ($data['image_action'] === 'remove' || $data['image_action'] === 'upload' ? null : $product->external_image_url),
                ]);
                $variant = $product->variants()->firstOrFail();
                $variant->update(['sku' => $product->sku]);
                $keptIds = [];
                foreach ($data['units'] as $unitData) {
                    $productUnit = isset($unitData['id'])
                        ? $variant->units()->whereKey($unitData['id'])->firstOrFail()
                        : $variant->units()->firstOrNew(['unit_id' => $unitData['unit_id']]);
                    $productUnit->fill([
                        'unit_id' => $unitData['unit_id'],
                        'conversion_to_base' => $unitData['conversion_to_base'],
                        'sale_price' => $unitData['sale_price'],
                        'is_base' => $unitData['is_base'],
                        'is_default_sale' => $unitData['is_default_sale'],
                        'allows_fractional_quantity' => $unitData['allows_fractional_quantity'] ?? false,
                        'is_active' => true,
                    ])->save();
                    $keptIds[] = $productUnit->id;
                    $barcode = $productUnit->barcodes()->where('is_primary', true)->first();
                    if ($unitData['barcode'] ?? null) {
                        $barcode
                            ? $barcode->update(['value' => $unitData['barcode']])
                            : Barcode::query()->create(['product_unit_id' => $productUnit->id, 'value' => $unitData['barcode'], 'is_primary' => true]);
                    } elseif ($barcode) {
                        $barcode->delete();
                    }
                }
                $variant->units()->whereNotIn('id', $keptIds)->update(['is_active' => false, 'is_base' => false, 'is_default_sale' => false]);
                $this->resourceVersions->bumpAfterCommit($request->user(), ['catalog']);
            });
        } catch (\Throwable $exception) {
            $this->productImages->delete($newImagePath, $product->id);
            throw $exception;
        }

        if ($oldImagePath !== $product->fresh()->image_path && $oldImagePath !== $newImagePath) {
            $this->productImages->delete($oldImagePath, $product->id);
        }

        return back()->with('success', 'Đã cập nhật sản phẩm và quy cách bán.');
    }

    /** @return array<string, mixed> */
    private function formOptions(Request $request): array
    {
        $organizationId = $request->user()->organization_id;

        return [
            'categories' => Category::query()->where('organization_id', $organizationId)->where('is_active', true)->orderBy('name')->get(['id', 'name']),
            'units' => Unit::query()->where('organization_id', $organizationId)->where('is_active', true)->orderBy('name')->get(['id', 'code', 'name']),
        ];
    }
}
