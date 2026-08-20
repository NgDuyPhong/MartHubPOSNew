<?php

use App\Models\Branch;
use App\Models\Organization;
use App\Models\Product;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

function imageFixture(string $role = 'owner'): array
{
    $organization = Organization::query()->create(['code' => fake()->unique()->lexify('IMG-????'), 'name' => 'Image Mart']);
    $branch = Branch::query()->create(['organization_id' => $organization->id, 'code' => 'MAIN', 'name' => 'Cửa hàng chính']);
    $user = User::factory()->create(['organization_id' => $organization->id, 'branch_id' => $branch->id, 'role' => $role, 'is_active' => true]);
    $unit = Unit::query()->create(['organization_id' => $organization->id, 'code' => 'EA', 'name' => 'Cái', 'is_active' => true]);

    return compact('organization', 'branch', 'user', 'unit');
}

function imagePayload(int $unitId): array
{
    return [
        'name' => 'Sản phẩm có ảnh',
        'sku' => fake()->unique()->lexify('IMG-???'),
        'image_action' => 'none',
        'track_lot' => false,
        'track_expiry' => false,
        'is_active' => true,
        'units' => [[
            'unit_id' => $unitId,
            'conversion_to_base' => 1,
            'sale_price' => 5000,
            'is_base' => true,
            'is_default_sale' => true,
            'allows_fractional_quantity' => false,
        ]],
    ];
}

test('product upload is optimized into a managed image and exposes one contract', function () {
    Storage::fake('public');
    $fixture = imageFixture();
    $payload = imagePayload($fixture['unit']->id);
    $payload['image_action'] = 'upload';
    $payload['image'] = UploadedFile::fake()->image('product.jpg', 80, 80);

    $this->actingAs($fixture['user'])->post(route('products.store'), $payload)->assertRedirect();

    $product = Product::query()->where('organization_id', $fixture['organization']->id)->firstOrFail();
    expect($product->image_path)->toStartWith("products/{$fixture['organization']->id}/")
        ->and($product->external_image_url)->toBeNull()
        ->and($product->image_source)->toBe('upload')
        ->and($product->image_url)->toContain('/storage/products/');
    Storage::disk('public')->assertExists($product->image_path);
});

test('external image mode accepts public HTTPS and rejects unsafe schemes', function () {
    $fixture = imageFixture();
    $payload = imagePayload($fixture['unit']->id);
    $payload['image_action'] = 'external';
    $payload['external_image_url'] = 'https://cdn.example.com/products/item.webp';

    $this->actingAs($fixture['user'])->post(route('products.store'), $payload)->assertRedirect();
    $product = Product::query()->where('organization_id', $fixture['organization']->id)->firstOrFail();
    expect($product->image_path)->toBeNull()->and($product->external_image_url)->toBe($payload['external_image_url'])->and($product->image_source)->toBe('external');

    $invalid = imagePayload($fixture['unit']->id);
    $invalid['image_action'] = 'external';
    $invalid['external_image_url'] = 'http://localhost/item.jpg';
    $this->actingAs($fixture['user'])->post(route('products.store'), $invalid)->assertSessionHasErrors('external_image_url');
});

test('replacing and removing a managed image cleans up the old file', function () {
    Storage::fake('public');
    $fixture = imageFixture();
    $create = imagePayload($fixture['unit']->id);
    $create['image_action'] = 'upload';
    $create['image'] = UploadedFile::fake()->image('first.jpg', 80, 80);
    $this->actingAs($fixture['user'])->post(route('products.store'), $create)->assertRedirect();

    $product = Product::query()->where('organization_id', $fixture['organization']->id)->with('variants.units')->firstOrFail();
    $oldPath = $product->image_path;
    $unit = $product->variants->first()->units->first();
    $update = array_merge(imagePayload($fixture['unit']->id), [
        '_method' => 'put',
        'image_action' => 'upload',
        'image' => UploadedFile::fake()->image('second.jpg', 80, 80),
        'name' => $product->name,
        'sku' => $product->sku,
        'units' => [[
            'id' => $unit->id,
            'unit_id' => $fixture['unit']->id,
            'conversion_to_base' => 1,
            'sale_price' => 5000,
            'is_base' => true,
            'is_default_sale' => true,
            'allows_fractional_quantity' => false,
        ]],
    ]);
    $this->actingAs($fixture['user'])->post(route('products.update', $product), $update)->assertRedirect();
    $newPath = $product->refresh()->image_path;
    Storage::disk('public')->assertMissing($oldPath);
    Storage::disk('public')->assertExists($newPath);

    $remove = $update;
    $remove['image_action'] = 'remove';
    unset($remove['image']);
    $this->actingAs($fixture['user'])->post(route('products.update', $product), $remove)->assertRedirect();
    expect($product->refresh()->image_path)->toBeNull();
    Storage::disk('public')->assertMissing($newPath);
});

test('cashier cannot upload product images', function () {
    $fixture = imageFixture('cashier');
    $payload = imagePayload($fixture['unit']->id);
    $payload['image_action'] = 'upload';
    $payload['image'] = UploadedFile::fake()->image('product.jpg');

    $this->actingAs($fixture['user'])->post(route('products.store'), $payload)->assertForbidden();
});

test('product image audit is a dry run by default', function () {
    Storage::fake('public');

    $this->artisan('catalog:images-audit')
        ->expectsOutputToContain('Found 0 unreferenced image(s)')
        ->expectsOutputToContain('Dry-run only')
        ->assertExitCode(0);
});
