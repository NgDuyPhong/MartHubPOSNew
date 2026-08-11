<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreProductRequest;
use App\Models\Barcode;
use App\Models\Category;
use App\Models\Product;
use App\Models\Unit;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class ProductController extends Controller
{
    public function index(Request $request): Response
    {
        $organizationId = $request->user()->organization_id;

        return Inertia::render('products/index', [
            'products' => Product::query()->where('organization_id', $organizationId)->with([
                'category:id,name',
                'variants' => fn ($query) => $query->with([
                    'units' => fn ($unitQuery) => $unitQuery->where('is_active', true)->with(['unit:id,code,name', 'barcodes:id,product_unit_id,value']),
                    'balances' => fn ($balanceQuery) => $balanceQuery->where('branch_id', $request->user()->branch_id)->whereNull('inventory_lot_id'),
                ]),
            ])->latest()->paginate(30),
            'categories' => Category::query()->where('organization_id', $organizationId)->where('is_active', true)->orderBy('name')->get(['id', 'name']),
            'units' => Unit::query()->where('organization_id', $organizationId)->where('is_active', true)->orderBy('name')->get(['id', 'code', 'name']),
        ]);
    }

    public function store(StoreProductRequest $request): RedirectResponse
    {
        DB::transaction(function () use ($request) {
            $data = $request->validated();
            $product = Product::query()->create([
                'organization_id' => $request->user()->organization_id,
                'category_id' => $data['category_id'] ?? null,
                'sku' => $data['sku'],
                'name' => $data['name'],
                'image_path' => $request->file('image')?->store('products', 'public'),
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
                    'is_active' => true,
                ]);
                if ($unitData['barcode'] ?? null) {
                    Barcode::query()->create(['product_unit_id' => $productUnit->id, 'value' => $unitData['barcode'], 'is_primary' => true]);
                }
            }
        });

        return back()->with('success', 'Đã tạo sản phẩm và quy cách bán.');
    }

    public function update(StoreProductRequest $request, Product $product): RedirectResponse
    {
        abort_unless($product->organization_id === $request->user()->organization_id, 403);

        DB::transaction(function () use ($request, $product) {
            $data = $request->validated();
            $product->update([
                'category_id' => $data['category_id'] ?? null,
                'sku' => $data['sku'],
                'name' => $data['name'],
                'track_lot' => $data['track_lot'] ?? false,
                'track_expiry' => $data['track_expiry'] ?? false,
                'is_active' => $data['is_active'] ?? true,
                ...($request->hasFile('image') ? ['image_path' => $request->file('image')->store('products', 'public')] : []),
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
        });

        return back()->with('success', 'Đã cập nhật sản phẩm và quy cách bán.');
    }
}
