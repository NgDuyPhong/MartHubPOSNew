<?php

use App\Services\LegacyImportService;

function createLegacyBundle(array $files, array $manifestOverrides = []): string
{
    $directory = sys_get_temp_dir().DIRECTORY_SEPARATOR.'marthub-import-test-'.uniqid('', true);
    mkdir($directory, 0700, true);
    $zipPath = $directory.DIRECTORY_SEPARATOR.'bundle.zip';
    $zip = new ZipArchive;
    $zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE);
    $files = array_merge([
        'data/categories.ndjson' => '',
        'data/units.ndjson' => '',
        'data/products.ndjson' => '',
        'data/product_units.ndjson' => '',
        'data/product_prices.ndjson' => '',
        'data/inventory.ndjson' => '',
    ], $files);
    $checksums = [];

    foreach ($files as $name => $contents) {
        $checksums[$name] = ['bytes' => strlen($contents), 'sha256' => hash('sha256', $contents)];
        $zip->addFromString($name, $contents);
    }

    $manifest = array_merge([
        'contract' => 'marthub-legacy/v1',
        'scope' => 'product_catalog',
        'status' => 'complete',
        'export_id' => '00000000-0000-4000-8000-000000000001',
        'control_totals' => [],
        'files' => $checksums,
    ], $manifestOverrides);
    $zip->addFromString('manifest.json', json_encode($manifest, JSON_THROW_ON_ERROR));
    $zip->close();

    return $zipPath;
}

it('profiles a valid versioned bundle without writing to the database', function () {
    $bundle = createLegacyBundle([
        'data/products.ndjson' => json_encode(['id' => 10, '_source_table' => 'products', '_source_id' => 10, 'name' => 'Cà phê', 'sku' => 'CF01']).PHP_EOL,
    ]);

    $result = app(LegacyImportService::class)->import($bundle);

    expect($result['status'])->toBe('dry_run')
        ->and($result['profile']['products']['rows'])->toBe(1);
});

it('honors the post-cutover feature flag', function () {
    $bundle = createLegacyBundle([
        'data/products.ndjson' => json_encode(['id' => 10, 'name' => 'Cà phê']).PHP_EOL,
    ]);
    config(['legacy-product-import.enabled' => false]);

    expect(fn () => app(LegacyImportService::class)->import($bundle))
        ->toThrow(RuntimeException::class, 'Legacy product import is disabled');
});

it('rejects bundles that contain customer or transaction data', function () {
    $bundle = createLegacyBundle([
        'data/invoices.ndjson' => json_encode(['id' => 1, 'invoice_number' => 'HD-1']).PHP_EOL,
    ]);

    expect(fn () => app(LegacyImportService::class)->import($bundle))
        ->toThrow(RuntimeException::class, 'Bundle contains data outside the product catalog scope');
});

it('rejects unsafe paths in a bundle before extraction', function () {
    $directory = sys_get_temp_dir().DIRECTORY_SEPARATOR.'marthub-unsafe-'.uniqid('', true);
    mkdir($directory, 0700, true);
    $bundle = $directory.DIRECTORY_SEPARATOR.'unsafe.zip';
    $zip = new ZipArchive;
    $zip->open($bundle, ZipArchive::CREATE | ZipArchive::OVERWRITE);
    $zip->addFromString('../manifest.json', '{}');
    $zip->close();

    expect(fn () => app(LegacyImportService::class)->import($bundle))
        ->toThrow(RuntimeException::class, 'Unsafe path found in export ZIP.');
});

it('reports duplicate barcodes during preview before writing data', function () {
    $bundle = createLegacyBundle([
        'data/products.ndjson' => implode('', [
            json_encode(['id' => 10, '_source_table' => 'products', '_source_id' => 10, 'name' => 'Cà phê', 'barcode' => '0001']).PHP_EOL,
            json_encode(['id' => 11, '_source_table' => 'products', '_source_id' => 11, 'name' => 'Trà', 'barcode' => '0001']).PHP_EOL,
        ]),
    ]);

    $result = app(LegacyImportService::class)->import($bundle);

    expect($result['validation']['errors'])->toContain('Barcode collision: 0001');
});

it('treats legacy zero unit conversion as the missing base conversion', function () {
    $bundle = createLegacyBundle([
        'data/products.ndjson' => json_encode(['id' => 10, '_source_table' => 'products', '_source_id' => 10, 'name' => 'Cà phê', 'unit_conversion' => 0]).PHP_EOL,
    ]);

    $result = app(LegacyImportService::class)->import($bundle);

    expect($result['validation']['errors'])->not->toContain('Product 10 has invalid unit_conversion.')
        ->and($result['validation']['warnings'])->toContain('1 products have unit_conversion=0; treated as base conversion 1. Sample source IDs: 10');
});
