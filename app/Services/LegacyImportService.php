<?php

namespace App\Services;

use App\Models\Barcode;
use App\Models\Branch;
use App\Models\Category;
use App\Models\Organization;
use App\Models\Product;
use App\Models\ProductUnit;
use App\Models\ProductVariant;
use App\Models\Unit;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;
use Throwable;
use ZipArchive;

class LegacyImportService
{
    private const CONTRACT = 'marthub-legacy/v1';

    private const MAX_ENTRIES = 5000;

    private const MAX_UNCOMPRESSED_BYTES = 536870912;

    private const DATA_FILES = [
        'data/categories.ndjson',
        'data/units.ndjson',
        'data/products.ndjson',
        'data/product_units.ndjson',
        'data/product_prices.ndjson',
        'data/inventory.ndjson',
    ];

    /**
     * @param  array{organization_id?: ?int, branch_id?: ?int, execute?: bool, force?: bool}  $options
     * @return array<string, mixed>
     */
    public function import(string $bundlePath, array $options = []): array
    {
        if (! config('legacy-product-import.enabled', true) && ! ($options['force'] ?? false)) {
            throw new RuntimeException('Legacy product import is disabled. Set LEGACY_PRODUCT_IMPORT_ENABLED=true for the one-time run.');
        }

        if (! is_file($bundlePath)) {
            throw new RuntimeException("Bundle does not exist: {$bundlePath}");
        }

        $bundleSha256 = hash_file('sha256', $bundlePath);
        $temporaryDirectory = storage_path('app/private/legacy-imports/'.Str::uuid());
        $transactionStarted = false;
        try {
            $manifest = $this->extractAndValidate($bundlePath, $temporaryDirectory);
            $profile = $this->profile($temporaryDirectory);
            $semantic = $this->semanticValidation($temporaryDirectory);

            if (! ($options['execute'] ?? false)) {
                return [
                    'status' => 'dry_run',
                    'bundle_sha256' => $bundleSha256,
                    'export_id' => $manifest['export_id'],
                    'contract' => $manifest['contract'],
                    'profile' => $profile,
                    'validation' => $semantic,
                    'control_totals' => $manifest['control_totals'] ?? [],
                ];
            }

            [$organization, $branch] = $this->resolveScope($options);
            if ($semantic['errors'] !== []) {
                throw new RuntimeException('Legacy bundle semantic validation failed: '.json_encode($semantic['errors'], JSON_UNESCAPED_UNICODE));
            }
            $this->assertTargetHasNoConflicts($temporaryDirectory, $organization->id);
            $sourceSystem = 'legacy:'.$organization->id;
            $counts = [];
            $errors = [];
            $maps = [];
            DB::beginTransaction();
            $transactionStarted = true;

            $this->processRows($temporaryDirectory, 'categories.ndjson', 'Category', $sourceSystem, $maps, $counts, $errors, function (array $row) use ($organization): array {
                $name = trim((string) ($row['name'] ?? ''));
                if ($name === '') {
                    throw new RuntimeException('Category name is empty.');
                }
                $category = Category::firstOrCreate(['organization_id' => $organization->id, 'name' => $name], ['is_active' => (bool) ($row['is_active'] ?? true)]);

                return ['type' => 'Category', 'id' => $category->id];
            });

            $this->processRows($temporaryDirectory, 'units.ndjson', 'Unit', $sourceSystem, $maps, $counts, $errors, function (array $row) use ($organization): array {
                $name = trim((string) ($row['name'] ?? ''));
                if ($name === '') {
                    throw new RuntimeException('Unit name is empty.');
                }
                $code = $this->unitCode($row);
                $unit = Unit::firstOrCreate(['organization_id' => $organization->id, 'code' => $code], ['name' => $name, 'is_active' => (bool) ($row['is_active'] ?? true)]);

                return ['type' => 'Unit', 'id' => $unit->id];
            });

            $this->processRows($temporaryDirectory, 'products.ndjson', 'Product', $sourceSystem, $maps, $counts, $errors, function (array $row) use ($organization, $sourceSystem, $temporaryDirectory, &$maps): array {
                $name = trim((string) ($row['name'] ?? ''));
                $sku = trim((string) ($row['sku'] ?? $row['code'] ?? '')) ?: 'LEGACY-'.($row['_source_id'] ?? $row['id'] ?? Str::random(8));
                if ($name === '') {
                    throw new RuntimeException('Product name is empty.');
                }
                $categoryId = $this->mappedTargetId($maps, $sourceSystem, 'product_categories', (string) ($row['category_id'] ?? ''), 'Category');
                $product = Product::firstOrCreate(['organization_id' => $organization->id, 'sku' => $sku], [
                    'category_id' => $categoryId,
                    'name' => $name,
                    'track_lot' => false,
                    'track_expiry' => false,
                    'is_active' => (bool) ($row['is_active'] ?? true),
                ]);
                $variant = ProductVariant::firstOrCreate(['product_id' => $product->id, 'sku' => $sku], ['name' => 'Mặc định', 'last_cost_base' => $this->money($row['cost_price'] ?? 0), 'is_active' => $product->is_active]);
                $unitId = $this->mappedTargetId($maps, $sourceSystem, 'units', (string) ($row['unit_id'] ?? ''), 'Unit');
                if ($unitId === null) {
                    $unitName = trim((string) ($row['base_unit'] ?? $row['unit'] ?? 'Cái')) ?: 'Cái';
                    $unit = Unit::firstOrCreate(
                        ['organization_id' => $organization->id, 'code' => Str::upper(Str::slug($unitName, '_'))],
                        ['name' => $unitName, 'is_active' => true],
                    );
                    $unitId = $unit->id;
                }
                $defaultUnit = ProductUnit::firstOrCreate(
                    ['product_variant_id' => $variant->id, 'unit_id' => $unitId],
                    [
                        'conversion_to_base' => 1,
                        'sale_price' => $this->money($row['retail_price'] ?? $row['selling_price'] ?? $row['base_unit_price'] ?? 0),
                        'is_base' => true,
                        'is_default_sale' => true,
                        'is_active' => (bool) ($row['is_active'] ?? true),
                    ],
                );
                foreach ([$row['barcode'] ?? null, $row['alternate_barcode'] ?? null] as $index => $barcode) {
                    $barcode = trim((string) $barcode);
                    if ($barcode !== '') {
                        $this->attachBarcode($barcode, $defaultUnit->id, $index === 0);
                    }
                }
                $conversion = (float) ($row['unit_conversion'] ?? 1);
                $baseUnitName = trim((string) ($row['base_unit'] ?? ''));
                if ($conversion > 1 && $baseUnitName !== '') {
                    $packageUnit = Unit::firstOrCreate(
                        ['organization_id' => $organization->id, 'code' => $this->unitCode(['name' => $baseUnitName, 'symbol' => $baseUnitName])],
                        ['name' => $baseUnitName, 'is_active' => true],
                    );
                    ProductUnit::updateOrCreate(
                        ['product_variant_id' => $variant->id, 'unit_id' => $packageUnit->id],
                        [
                            'conversion_to_base' => $conversion,
                            'sale_price' => $this->money($row['base_unit_price'] ?? 0),
                            'is_base' => false,
                            'is_default_sale' => false,
                            'is_active' => (bool) ($row['is_active'] ?? true),
                        ],
                    );
                }
                $this->copyProductImage($temporaryDirectory, $row, $product);

                return ['type' => 'Product', 'id' => $product->id, 'variant_id' => $variant->id];
            });

            $this->processRows($temporaryDirectory, 'product_units.ndjson', 'ProductUnit', $sourceSystem, $maps, $counts, $errors, function (array $row) use ($organization, $sourceSystem, &$maps): array {
                $productId = (string) ($row['product_id'] ?? '');
                $variantId = $this->mappedTargetId($maps, $sourceSystem, 'products', $productId, 'ProductVariant');
                if ($variantId === null) {
                    throw new RuntimeException('Product unit references an unmapped product.');
                }
                $unitId = $this->mappedTargetId($maps, $sourceSystem, 'units', (string) ($row['unit_id'] ?? ''), 'Unit');
                if ($unitId === null) {
                    $unitName = trim((string) ($row['unit_name'] ?? ''));
                    if ($unitName !== '') {
                        $unit = Unit::firstOrCreate(
                            ['organization_id' => $organization->id, 'code' => Str::upper(Str::slug($unitName, '_'))],
                            ['name' => $unitName, 'is_active' => true],
                        );
                        $unitId = $unit->id;
                    }
                }
                if ($unitId === null) {
                    throw new RuntimeException('Product unit references an unmapped unit.');
                }
                $conversion = (float) ($row['unit_value'] ?? $row['conversion_to_base'] ?? 1);
                if ($conversion <= 0) {
                    throw new RuntimeException('Unit conversion must be greater than zero.');
                }
                $productUnit = ProductUnit::firstOrCreate(['product_variant_id' => $variantId, 'unit_id' => $unitId], [
                    'conversion_to_base' => $conversion,
                    'sale_price' => $this->money($row['sale_price'] ?? $row['price'] ?? 0),
                    'is_base' => $conversion === 1.0,
                    'is_default_sale' => (bool) ($row['is_default'] ?? false),
                    'is_active' => (bool) ($row['is_active'] ?? true),
                ]);
                $barcode = trim((string) ($row['barcode'] ?? ''));
                if ($barcode !== '') {
                    $this->attachBarcode($barcode, $productUnit->id, true);
                }

                return ['type' => 'ProductUnit', 'id' => $productUnit->id];
            });

            $this->processRows($temporaryDirectory, 'product_prices.ndjson', 'ProductUnitPrice', $sourceSystem, $maps, $counts, $errors, function (array $row) use ($organization, $sourceSystem, &$maps): array {
                $variantId = $this->mappedTargetId($maps, $sourceSystem, 'products', (string) ($row['product_id'] ?? ''), 'ProductVariant');
                if ($variantId === null) {
                    throw new RuntimeException('Product price references an unmapped product.');
                }
                $priceType = Str::lower(trim((string) ($row['price_type'] ?? '')));
                if ($priceType === 'si') {
                    throw new RuntimeException('Customer/group pricing is not supported by the target schema.');
                }
                if ($priceType === 'le') {
                    $productUnit = ProductUnit::query()->where('product_variant_id', $variantId)->where('is_base', true)->firstOrFail();
                    $productUnit->update(['sale_price' => $this->money($row['price'] ?? 0)]);
                } elseif (in_array($priceType, ['thung', 'loc'], true)) {
                    $unitName = trim((string) ($row['unit'] ?? ''));
                    $conversion = (float) ($row['quantity_per_unit'] ?? 0);
                    if ($unitName === '' || $conversion <= 1) {
                        throw new RuntimeException('Package price requires a unit name and quantity_per_unit greater than one.');
                    }
                    $unit = Unit::firstOrCreate(
                        ['organization_id' => $organization->id, 'code' => $this->unitCode(['name' => $unitName, 'symbol' => $unitName])],
                        ['name' => $unitName, 'is_active' => true],
                    );
                    $productUnit = ProductUnit::updateOrCreate(
                        ['product_variant_id' => $variantId, 'unit_id' => $unit->id],
                        ['conversion_to_base' => $conversion, 'sale_price' => $this->money($row['price'] ?? 0), 'is_base' => false, 'is_default_sale' => false, 'is_active' => (bool) ($row['is_active'] ?? true)],
                    );
                } else {
                    throw new RuntimeException("Unsupported price_type: {$priceType}");
                }

                return ['type' => 'ProductUnitPrice', 'id' => $productUnit->id];
            });

            $this->processRows($temporaryDirectory, 'inventory.ndjson', 'InventoryOpening', $sourceSystem, $maps, $counts, $errors, function (array $row) use ($branch, $sourceSystem, &$maps, $manifest): array {
                $variantId = $this->mappedTargetId($maps, $sourceSystem, 'products', (string) ($row['product_id'] ?? ''), 'ProductVariant');
                if ($variantId === null) {
                    throw new RuntimeException('Inventory references an unmapped product.');
                }
                $scopeKey = implode(':', [$branch->id, $variantId, 0]);
                $quantity = (float) ($row['current_stock'] ?? 0);
                $balanceId = DB::table('inventory_balances')->insertGetId([
                    'branch_id' => $branch->id,
                    'product_variant_id' => $variantId,
                    'inventory_lot_id' => null,
                    'scope_key' => $scopeKey,
                    'quantity_base' => $quantity,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
                $movementId = DB::table('inventory_movements')->insertGetId([
                    'branch_id' => $branch->id,
                    'product_variant_id' => $variantId,
                    'inventory_lot_id' => null,
                    'user_id' => null,
                    'type' => 'opening_balance',
                    'quantity_base' => $quantity,
                    'balance_after' => $quantity,
                    'source_type' => 'legacy_import',
                    'source_id' => (int) sprintf('%u', crc32((string) $manifest['export_id'])),
                    'reason' => 'Legacy opening stock',
                    'metadata' => json_encode(['legacy_product_id' => $row['product_id'] ?? null]),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                return ['type' => 'InventoryMovement', 'id' => $movementId, 'balance_id' => $balanceId];
            });

            if ($errors !== []) {
                throw new RuntimeException('Legacy import failed with row errors: '.json_encode($errors, JSON_UNESCAPED_UNICODE));
            }
            DB::commit();
            $transactionStarted = false;
            $status = 'completed';
            $reconciliation = $this->reconcile($profile, $counts, $errors, $manifest);

            return ['status' => $status, 'export_id' => $manifest['export_id'], 'bundle_sha256' => $bundleSha256, 'counts' => $counts, 'errors' => $errors, 'reconciliation' => $reconciliation];
        } catch (Throwable $exception) {
            if ($transactionStarted && DB::transactionLevel() > 0) {
                DB::rollBack();
            }
            throw $exception;
        } finally {
            $this->deleteDirectory($temporaryDirectory);
        }
    }

    /** @return array{0: Organization, 1: Branch} */
    private function resolveScope(array $options): array
    {
        if (! isset($options['organization_id'], $options['branch_id'])) {
            throw new RuntimeException('Organization and branch are required for an execute import.');
        }
        $organization = Organization::find($options['organization_id']);
        if ($organization === null) {
            throw new RuntimeException('Create an organization before executing a legacy import.');
        }
        $branch = Branch::where('organization_id', $organization->id)->find($options['branch_id']);
        if ($branch === null) {
            throw new RuntimeException('Create a branch before executing a legacy import.');
        }

        return [$organization, $branch];
    }

    /**
     * @param  array<string, int>  $counts
     * @param  list<array<string, string>>  $errors
     * @param  callable(array<string, mixed>): array<string, mixed>  $handler
     */
    private function processRows(string $directory, string $file, string $targetType, string $sourceSystem, array &$maps, array &$counts, array &$errors, callable $handler): void
    {
        $path = $directory.DIRECTORY_SEPARATOR.'data'.DIRECTORY_SEPARATOR.$file;
        if (! is_file($path)) {
            return;
        }
        $entity = pathinfo($file, PATHINFO_FILENAME);
        foreach ($this->readNdjson($path) as $row) {
            $sourceTable = (string) ($row['_source_table'] ?? $entity);
            $sourceId = (string) ($row['_source_id'] ?? $row['id'] ?? '');
            $sourceChecksum = hash('sha256', $this->encode($row));
            $key = $sourceSystem.'|'.$sourceTable.'|'.$sourceId.'|'.$targetType;
            try {
                if ($sourceId === '') {
                    throw new RuntimeException('Source ID is required.');
                }
                $mapped = $maps[$key] ?? null;
                if ($mapped !== null) {
                    if (($mapped['checksum'] ?? null) !== $sourceChecksum) {
                        throw new RuntimeException('Duplicate source ID has different row content.');
                    }
                    $counts[$entity]['skipped_unchanged'] = ($counts[$entity]['skipped_unchanged'] ?? 0) + 1;

                    continue;
                }
                $result = DB::transaction(fn (): array => $handler($row));
                $maps[$sourceSystem.'|'.$sourceTable.'|'.$sourceId.'|'.$result['type']] = ['target_id' => (int) $result['id'], 'checksum' => $sourceChecksum];
                if (isset($result['variant_id'])) {
                    $maps[$sourceSystem.'|products|'.$sourceId.'|ProductVariant'] = ['target_id' => (int) $result['variant_id'], 'checksum' => $sourceChecksum];
                }
                $counts[$entity]['imported'] = ($counts[$entity]['imported'] ?? 0) + 1;
            } catch (Throwable $exception) {
                $counts[$entity]['error'] = ($counts[$entity]['error'] ?? 0) + 1;
                $errors[] = ['entity' => $entity, 'source_id' => $sourceId, 'message' => $exception->getMessage(), 'key' => $key];
            }
        }
    }

    private function mappedTargetId(array $maps, string $sourceSystem, string $sourceTable, string $sourceId, string $targetType): ?int
    {
        if ($sourceId === '') {
            return null;
        }

        return isset($maps[$sourceSystem.'|'.$sourceTable.'|'.$sourceId.'|'.$targetType])
            ? (int) $maps[$sourceSystem.'|'.$sourceTable.'|'.$sourceId.'|'.$targetType]['target_id']
            : null;
    }

    private function attachBarcode(string $value, int $productUnitId, bool $isPrimary): Barcode
    {
        $barcode = Barcode::query()->where('value', $value)->first();
        if ($barcode !== null && (int) $barcode->product_unit_id !== $productUnitId) {
            throw new RuntimeException("Barcode collision: {$value}");
        }
        if ($barcode === null) {
            return Barcode::create(['product_unit_id' => $productUnitId, 'value' => $value, 'is_primary' => $isPrimary]);
        }
        if ($isPrimary && ! $barcode->is_primary) {
            $barcode->update(['is_primary' => true]);
        }

        return $barcode;
    }

    /** @return array{errors: list<string>, warnings: list<string>, counts: array<string, int>} */
    private function semanticValidation(string $directory): array
    {
        $errors = [];
        $warnings = [];
        $counts = [];
        $zeroConversionProducts = [];
        $categories = [];
        $units = [];
        $unitCodeOwners = [];
        $products = [];
        $skuOwners = [];
        $barcodeOwners = [];

        foreach ($this->readNdjson($directory.DIRECTORY_SEPARATOR.'data'.DIRECTORY_SEPARATOR.'categories.ndjson') as $row) {
            $id = (string) ($row['_source_id'] ?? $row['id'] ?? '');
            $name = trim((string) ($row['name'] ?? ''));
            $counts['categories'] = ($counts['categories'] ?? 0) + 1;
            if ($id === '' || $name === '') {
                $errors[] = 'Category requires source ID and name.';
            } elseif (isset($categories[$id])) {
                $errors[] = "Duplicate category source ID: {$id}";
            } else {
                $categories[$id] = true;
            }
        }
        foreach ($this->readNdjson($directory.DIRECTORY_SEPARATOR.'data'.DIRECTORY_SEPARATOR.'units.ndjson') as $row) {
            $id = (string) ($row['_source_id'] ?? $row['id'] ?? '');
            $name = trim((string) ($row['name'] ?? ''));
            $counts['units'] = ($counts['units'] ?? 0) + 1;
            if ($id === '' || $name === '') {
                $errors[] = 'Unit requires source ID and name.';
            } elseif (isset($units[$id])) {
                $errors[] = "Duplicate unit source ID: {$id}";
            } else {
                $units[$id] = true;
                $code = $this->unitCode($row);
                if (isset($unitCodeOwners[$code]) && $unitCodeOwners[$code] !== $name) {
                    $errors[] = "Unit code collision: {$code}";
                }
                $unitCodeOwners[$code] = $name;
            }
        }
        foreach ($this->readNdjson($directory.DIRECTORY_SEPARATOR.'data'.DIRECTORY_SEPARATOR.'products.ndjson') as $row) {
            $id = (string) ($row['_source_id'] ?? $row['id'] ?? '');
            $name = trim((string) ($row['name'] ?? ''));
            $sku = trim((string) ($row['sku'] ?? $row['code'] ?? '')) ?: 'LEGACY-'.$id;
            $counts['products'] = ($counts['products'] ?? 0) + 1;
            if ($id === '' || $name === '') {
                $errors[] = 'Product requires source ID and name.';

                continue;
            }
            if (isset($products[$id])) {
                $errors[] = "Duplicate product source ID: {$id}";
            }
            if (isset($skuOwners[$sku]) && $skuOwners[$sku] !== $id) {
                $errors[] = "Duplicate product SKU: {$sku}";
            }
            $products[$id] = true;
            $skuOwners[$sku] = $id;
            $categoryId = trim((string) ($row['category_id'] ?? ''));
            if ($categoryId !== '' && ! isset($categories[$categoryId])) {
                $errors[] = "Product {$id} references unknown category {$categoryId}.";
            }
            $unitId = trim((string) ($row['unit_id'] ?? ''));
            if ($unitId !== '' && ! isset($units[$unitId])) {
                $errors[] = "Product {$id} references unknown unit {$unitId}.";
            }
            foreach (['barcode', 'alternate_barcode'] as $field) {
                $barcode = trim((string) ($row[$field] ?? ''));
                if ($barcode !== '') {
                    if (isset($barcodeOwners[$barcode]) && $barcodeOwners[$barcode] !== $id) {
                        $errors[] = "Barcode collision: {$barcode}";
                    }
                    $barcodeOwners[$barcode] = $id;
                }
            }
            $rawConversion = $row['unit_conversion'] ?? null;
            if ($rawConversion !== null && trim((string) $rawConversion) !== '' && (float) $rawConversion < 0) {
                $errors[] = "Product {$id} has invalid unit_conversion.";
            } elseif ((float) ($rawConversion ?: 0) === 0.0) {
                $zeroConversionProducts[] = $id;
            }
        }
        foreach ($this->readNdjson($directory.DIRECTORY_SEPARATOR.'data'.DIRECTORY_SEPARATOR.'product_units.ndjson') as $row) {
            $productId = (string) ($row['product_id'] ?? '');
            $counts['product_units'] = ($counts['product_units'] ?? 0) + 1;
            if (! isset($products[$productId])) {
                $errors[] = "Product unit references unknown product {$productId}.";
            }
            $unitId = trim((string) ($row['unit_id'] ?? ''));
            $unitName = trim((string) ($row['unit_name'] ?? ''));
            if ($unitId !== '' && ! isset($units[$unitId]) && $unitName === '') {
                $errors[] = "Product unit references unknown unit {$unitId}.";
            } elseif ($unitId === '' && $unitName === '') {
                $errors[] = 'Product unit requires unit_id or unit_name.';
            }
            if ((float) ($row['unit_value'] ?? 1) <= 0) {
                $errors[] = "Product unit for product {$productId} has invalid conversion.";
            }
            $barcode = trim((string) ($row['barcode'] ?? ''));
            if ($barcode !== '') {
                if (isset($barcodeOwners[$barcode]) && $barcodeOwners[$barcode] !== $productId) {
                    $errors[] = "Barcode collision: {$barcode}";
                }
                $barcodeOwners[$barcode] = $productId;
            }
        }
        foreach ($this->readNdjson($directory.DIRECTORY_SEPARATOR.'data'.DIRECTORY_SEPARATOR.'product_prices.ndjson') as $row) {
            $productId = (string) ($row['product_id'] ?? '');
            $priceType = Str::lower(trim((string) ($row['price_type'] ?? '')));
            $counts['product_prices'] = ($counts['product_prices'] ?? 0) + 1;
            if (! isset($products[$productId])) {
                $errors[] = "Product price references unknown product {$productId}.";
            }
            if ($priceType === 'si') {
                $errors[] = "Product price {$productId} uses unsupported customer/group pricing.";
            } elseif ($priceType === 'le') {
                // Retail price is applied to the existing base unit.
            } elseif (in_array($priceType, ['thung', 'loc'], true)) {
                if (trim((string) ($row['unit'] ?? '')) === '' || (float) ($row['quantity_per_unit'] ?? 0) <= 1) {
                    $errors[] = "Package price for product {$productId} lacks a valid unit conversion.";
                }
            } else {
                $errors[] = "Unsupported price_type for product {$productId}: {$priceType}";
            }
        }
        foreach ($this->readNdjson($directory.DIRECTORY_SEPARATOR.'data'.DIRECTORY_SEPARATOR.'inventory.ndjson') as $row) {
            $productId = (string) ($row['product_id'] ?? '');
            $counts['inventory'] = ($counts['inventory'] ?? 0) + 1;
            if (! isset($products[$productId])) {
                $errors[] = "Inventory references unknown product {$productId}.";
            }
            if ((float) ($row['reserved_quantity'] ?? 0) !== 0.0) {
                $errors[] = "Inventory {$productId} has non-zero reserved_quantity; quantity basis needs approval.";
            }
        }
        if (($counts['products'] ?? 0) === 0) {
            $errors[] = 'Bundle contains no product rows.';
        }
        if ($zeroConversionProducts !== []) {
            $sample = implode(', ', array_slice($zeroConversionProducts, 0, 10));
            $warnings[] = sprintf('%d products have unit_conversion=0; treated as base conversion 1. Sample source IDs: %s%s', count($zeroConversionProducts), $sample, count($zeroConversionProducts) > 10 ? ', …' : '');
        }

        return compact('errors', 'warnings', 'counts');
    }

    private function assertTargetHasNoConflicts(string $directory, int $organizationId): void
    {
        $sourceSkus = [];
        foreach ($this->readNdjson($directory.DIRECTORY_SEPARATOR.'data'.DIRECTORY_SEPARATOR.'products.ndjson') as $row) {
            $sourceId = (string) ($row['_source_id'] ?? $row['id'] ?? '');
            $sourceSkus[] = trim((string) ($row['sku'] ?? $row['code'] ?? '')) ?: 'LEGACY-'.$sourceId;
        }
        $sourceSkus = array_values(array_unique(array_filter($sourceSkus)));
        if ($sourceSkus === []) {
            return;
        }
        $conflicts = Product::query()
            ->where('organization_id', $organizationId)
            ->whereIn('sku', $sourceSkus)
            ->pluck('sku')
            ->all();
        if ($conflicts !== []) {
            throw new RuntimeException('Target organization already contains imported product SKU(s): '.implode(', ', $conflicts).'. Use another target or remove the conflicting rows before retrying.');
        }
    }

    private function unitCode(array $row): string
    {
        $code = trim((string) ($row['code'] ?? $row['symbol'] ?? ''));

        return $code !== '' ? Str::upper($code) : Str::upper(Str::slug((string) ($row['name'] ?? 'unit'), '_'));
    }

    private function money(mixed $value): int
    {
        if ($value === null || $value === '') {
            return 0;
        }

        return (int) round((float) $value);
    }

    private function copyProductImage(string $directory, array $row, Product $product): void
    {
        $sourceId = (string) ($row['_source_id'] ?? $row['id'] ?? '');
        $image = trim((string) ($row['image'] ?? ''));
        if ($sourceId === '' || $image === '') {
            return;
        }
        $sourceName = 'images/'.$sourceId.'-'.basename(str_replace('\\', '/', $image));
        $sourcePath = $directory.DIRECTORY_SEPARATOR.str_replace('/', DIRECTORY_SEPARATOR, $sourceName);
        if (! is_file($sourcePath)) {
            return;
        }
        $extension = pathinfo($sourcePath, PATHINFO_EXTENSION);
        $target = 'products/legacy/'.$sourceId.($extension !== '' ? '.'.$extension : '');
        Storage::disk('public')->put($target, (string) file_get_contents($sourcePath));
        if ($product->image_path !== $target) {
            $product->forceFill(['image_path' => $target])->save();
        }
    }

    /** @return array<string, mixed> */
    private function reconcile(array $profile, array $counts, array $errors, array $manifest): array
    {
        $processed = [];
        foreach ($counts as $entity => $entityCounts) {
            $processed[$entity] = array_sum($entityCounts);
        }
        $source = [];
        foreach ($profile as $entity => $entityProfile) {
            $source[$entity] = $entityProfile['rows'];
        }
        $unprocessed = array_keys(array_filter($source, fn (int $rows, string $entity): bool => $rows > 0 && ! array_key_exists($entity, $counts), ARRAY_FILTER_USE_BOTH));

        return [
            'status' => count($errors) === 0 && $unprocessed === [] ? 'pass' : 'warning',
            'source_rows' => $source,
            'processed_rows' => $processed,
            'error_count' => count($errors),
            'unprocessed_entities' => $unprocessed,
            'control_totals' => $manifest['control_totals'] ?? [],
        ];
    }

    /** @return array<string, mixed> */
    private function extractAndValidate(string $bundlePath, string $temporaryDirectory): array
    {
        $zip = new ZipArchive;
        if ($zip->open($bundlePath) !== true) {
            throw new RuntimeException('Unable to open the export ZIP.');
        }
        $totalBytes = 0;
        if ($zip->numFiles > self::MAX_ENTRIES) {
            throw new RuntimeException('Export ZIP contains too many files.');
        }
        for ($index = 0; $index < $zip->numFiles; $index++) {
            $stat = $zip->statIndex($index);
            $name = str_replace('\\', '/', $stat['name'] ?? '');
            if ($name === '' || str_starts_with($name, '/') || preg_match('#(^|/)\.\.?(/|$)#', $name)) {
                throw new RuntimeException('Unsafe path found in export ZIP.');
            }
            if (str_starts_with($name, 'data/') && ! str_ends_with($name, '/') && ! in_array($name, self::DATA_FILES, true)) {
                throw new RuntimeException("Bundle contains data outside the product catalog scope: {$name}");
            }
            if ($name !== 'manifest.json' && ! str_starts_with($name, 'data/') && ! str_starts_with($name, 'images/') && ! str_starts_with($name, 'reports/')) {
                throw new RuntimeException("Bundle contains a file outside the product catalog scope: {$name}");
            }
            $totalBytes += (int) ($stat['size'] ?? 0);
            if ($totalBytes > self::MAX_UNCOMPRESSED_BYTES) {
                throw new RuntimeException('Export ZIP exceeds the uncompressed size limit.');
            }
        }
        if (! is_dir($temporaryDirectory) && ! mkdir($temporaryDirectory, 0750, true) && ! is_dir($temporaryDirectory)) {
            throw new RuntimeException('Unable to create the private import directory.');
        }
        if (! $zip->extractTo($temporaryDirectory)) {
            $zip->close();
            throw new RuntimeException('Unable to extract the export ZIP.');
        }
        $zip->close();
        $manifestPath = $temporaryDirectory.DIRECTORY_SEPARATOR.'manifest.json';
        if (! is_file($manifestPath)) {
            throw new RuntimeException('Export manifest is missing.');
        }
        $manifest = json_decode((string) file_get_contents($manifestPath), true, 512, JSON_THROW_ON_ERROR);
        if (($manifest['contract'] ?? null) !== self::CONTRACT || ($manifest['scope'] ?? null) !== 'product_catalog' || ($manifest['status'] ?? null) !== 'complete' || empty($manifest['export_id'])) {
            throw new RuntimeException('Unsupported or incomplete export contract.');
        }
        $manifestFiles = $manifest['files'] ?? [];
        if (! is_array($manifestFiles)) {
            throw new RuntimeException('Export manifest files metadata is invalid.');
        }
        foreach (self::DATA_FILES as $requiredFile) {
            $requiredPath = $temporaryDirectory.DIRECTORY_SEPARATOR.str_replace('/', DIRECTORY_SEPARATOR, $requiredFile);
            if (! is_file($requiredPath) || ! isset($manifestFiles[$requiredFile])) {
                throw new RuntimeException("Required export file is missing: {$requiredFile}");
            }
        }
        foreach ($manifestFiles as $relative => $metadata) {
            $path = $temporaryDirectory.DIRECTORY_SEPARATOR.str_replace('/', DIRECTORY_SEPARATOR, $relative);
            if (! is_file($path) || ! is_int($metadata['bytes'] ?? null) || filesize($path) !== $metadata['bytes'] || hash_file('sha256', $path) !== ($metadata['sha256'] ?? null)) {
                throw new RuntimeException("Export checksum mismatch: {$relative}");
            }
        }

        return $manifest;
    }

    /** @return array<string, array<string, int>> */
    private function profile(string $directory): array
    {
        $profile = [];
        foreach (glob($directory.DIRECTORY_SEPARATOR.'data'.DIRECTORY_SEPARATOR.'*.ndjson') ?: [] as $path) {
            $entity = pathinfo($path, PATHINFO_FILENAME);
            $profile[$entity] = ['rows' => 0, 'errors' => 0];
            foreach ($this->readNdjson($path) as $_) {
                $profile[$entity]['rows']++;
            }
        }

        return $profile;
    }

    /** @return iterable<array<string, mixed>> */
    private function readNdjson(string $path): iterable
    {
        $file = new \SplFileObject($path, 'rb');
        while (! $file->eof()) {
            $line = trim($file->fgets());
            if ($line === '') {
                continue;
            }
            $row = json_decode($line, true, 512, JSON_THROW_ON_ERROR);
            if (! is_array($row)) {
                throw new RuntimeException("NDJSON row must be a JSON object: {$path}");
            }
            yield $row;
        }
    }

    /** @param array<string, mixed> $payload */
    private function encode(array $payload): string
    {
        return json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE | JSON_THROW_ON_ERROR);
    }

    private function deleteDirectory(string $directory): void
    {
        if (! is_dir($directory)) {
            return;
        }
        $iterator = new \RecursiveIteratorIterator(new \RecursiveDirectoryIterator($directory, \FilesystemIterator::SKIP_DOTS), \RecursiveIteratorIterator::CHILD_FIRST);
        foreach ($iterator as $file) {
            $file->isDir() ? rmdir($file->getPathname()) : unlink($file->getPathname());
        }
        rmdir($directory);
    }
}
