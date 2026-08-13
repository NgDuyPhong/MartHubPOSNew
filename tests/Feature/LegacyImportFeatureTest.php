<?php

use App\Models\Barcode;
use App\Models\Branch;
use App\Models\Category;
use App\Models\Organization;
use App\Models\Product;
use App\Models\ProductUnit;
use App\Models\Unit;
use App\Services\LegacyImportService;
use Illuminate\Support\Facades\DB;

it('imports only the product catalog and current stock in one execution', function () {
    $organization = Organization::create(['code' => 'TEST', 'name' => 'Test organization', 'timezone' => 'Asia/Ho_Chi_Minh', 'is_active' => true]);
    $branch = Branch::create(['organization_id' => $organization->id, 'code' => 'TEST-01', 'name' => 'Test branch', 'is_active' => true]);
    $directory = sys_get_temp_dir().DIRECTORY_SEPARATOR.'marthub-import-feature-'.uniqid('', true);
    mkdir($directory, 0700, true);
    $bundle = $directory.DIRECTORY_SEPARATOR.'bundle.zip';
    $data = [
        'data/categories.ndjson' => json_encode(['id' => 1, '_source_table' => 'product_categories', '_source_id' => 1, 'name' => 'Đồ uống', 'is_active' => 1], JSON_THROW_ON_ERROR).PHP_EOL,
        'data/units.ndjson' => json_encode(['id' => 2, '_source_table' => 'units', '_source_id' => 2, 'name' => 'Chai', 'symbol' => 'chai', 'is_active' => 1], JSON_THROW_ON_ERROR).PHP_EOL,
        'data/products.ndjson' => json_encode(['id' => 10, '_source_table' => 'products', '_source_id' => 10, 'name' => 'Nước suối', 'sku' => 'NS01', 'barcode' => '0123456789', 'category_id' => 1, 'unit_id' => 2, 'cost_price' => '4000.00', 'retail_price' => '5000.00', 'is_active' => 1], JSON_THROW_ON_ERROR).PHP_EOL,
        'data/product_units.ndjson' => '',
        'data/product_prices.ndjson' => json_encode(['id' => 30, '_source_table' => 'product_prices', '_source_id' => 30, 'product_id' => 10, 'price_type' => 'thung', 'unit' => 'Thùng', 'quantity_per_unit' => 24, 'price' => '110000.00'], JSON_THROW_ON_ERROR).PHP_EOL,
        'data/inventory.ndjson' => json_encode(['id' => 40, '_source_table' => 'inventory', '_source_id' => 40, 'product_id' => 10, 'current_stock' => 120], JSON_THROW_ON_ERROR).PHP_EOL,
    ];
    $checksums = [];
    $zip = new ZipArchive;
    $zip->open($bundle, ZipArchive::CREATE | ZipArchive::OVERWRITE);
    foreach ($data as $name => $contents) {
        $checksums[$name] = ['bytes' => strlen($contents), 'sha256' => hash('sha256', $contents)];
        $zip->addFromString($name, $contents);
    }
    $zip->addFromString('manifest.json', json_encode([
        'contract' => 'marthub-legacy/v1',
        'scope' => 'product_catalog',
        'status' => 'complete',
        'export_id' => '00000000-0000-4000-8000-000000000002',
        'files' => $checksums,
        'control_totals' => [],
    ], JSON_THROW_ON_ERROR));
    $zip->close();

    $service = app(LegacyImportService::class);
    $first = $service->import($bundle, ['organization_id' => $organization->id, 'branch_id' => $branch->id, 'execute' => true]);
    expect($first['status'])->toBe('completed')
        ->and(Product::where('sku', 'NS01')->count())->toBe(1)
        ->and(ProductUnit::count())->toBe(2)
        ->and(Barcode::where('value', '0123456789')->count())->toBe(1)
        ->and(DB::table('inventory_balances')->where('quantity_base', 120)->count())->toBe(1)
        ->and(DB::table('inventory_balances')->where('scope_key', $branch->id.':'.DB::table('product_variants')->where('sku', 'NS01')->value('id').':0')->count())->toBe(1)
        ->and(Category::where('name', 'Đồ uống')->count())->toBe(1)
        ->and(Unit::where('code', 'CHAI')->count())->toBe(1);

    expect(fn () => $service->import($bundle, ['organization_id' => $organization->id, 'branch_id' => $branch->id, 'execute' => true]))
        ->toThrow(RuntimeException::class, 'already contains imported product SKU');
});
