<?php

use App\Models\Branch;
use App\Models\Organization;
use App\Models\Product;
use App\Models\ProductUnit;
use App\Models\ProductVariant;
use App\Models\Unit;
use App\Models\User;

function statusFixture(): array
{
    $organization = Organization::query()->create(['code' => fake()->unique()->lexify('STS-????'), 'name' => 'Status Mart']);
    $branch = Branch::query()->create(['organization_id' => $organization->id, 'code' => 'MAIN', 'name' => 'Cửa hàng chính']);
    $user = User::factory()->create(['organization_id' => $organization->id, 'branch_id' => $branch->id, 'role' => 'owner', 'is_active' => true]);
    $unit = Unit::query()->create(['organization_id' => $organization->id, 'code' => 'EA', 'name' => 'Cái', 'is_active' => true]);
    $product = Product::query()->create(['organization_id' => $organization->id, 'sku' => 'STATUS-001', 'name' => 'Sản phẩm trạng thái', 'is_active' => true]);
    $variant = ProductVariant::query()->create(['product_id' => $product->id, 'name' => 'Mặc định', 'sku' => $product->sku, 'last_cost_base' => 1000, 'is_active' => true]);
    $productUnit = ProductUnit::query()->create(['product_variant_id' => $variant->id, 'unit_id' => $unit->id, 'conversion_to_base' => 1, 'sale_price' => 5000, 'is_base' => true, 'is_default_sale' => true, 'is_active' => true]);

    return compact('organization', 'branch', 'user', 'product', 'productUnit');
}

test('status lifecycle removes and restores a product in the POS catalog without deleting data', function () {
    $fixture = statusFixture();
    $updatedAt = $fixture['product']->updated_at->toISOString();

    $this->actingAs($fixture['user'])->patch(route('products.status.update', $fixture['product']), ['is_active' => false, 'updated_at' => $updatedAt])->assertRedirect();

    expect($fixture['product']->refresh()->is_active)->toBeFalse();
    $this->actingAs($fixture['user'])->getJson(route('pos.snapshot', ['resources' => 'catalog']))->assertJsonCount(0, 'catalog');
    expect(ProductUnit::query()->whereKey($fixture['productUnit']->id)->exists())->toBeTrue();

    $this->actingAs($fixture['user'])->patch(route('products.status.update', $fixture['product']), ['is_active' => true, 'updated_at' => $fixture['product']->fresh()->updated_at->toISOString()])->assertRedirect();

    expect($fixture['product']->refresh()->is_active)->toBeTrue();
    $this->actingAs($fixture['user'])->getJson(route('pos.snapshot', ['resources' => 'catalog']))->assertJsonPath('catalog.0.id', $fixture['product']->id);
});

test('status mutation rejects stale product data and cashier access', function () {
    $fixture = statusFixture();
    $this->actingAs($fixture['user'])->patch(route('products.status.update', $fixture['product']), ['is_active' => false, 'updated_at' => now()->subMinute()->toISOString()])->assertStatus(409);

    $fixture = statusFixture();
    $cashier = User::factory()->create(['organization_id' => $fixture['organization']->id, 'branch_id' => $fixture['branch']->id, 'role' => 'cashier', 'is_active' => true]);
    $this->actingAs($cashier)->patch(route('products.status.update', $fixture['product']), ['is_active' => false, 'updated_at' => $fixture['product']->updated_at->toISOString()])->assertForbidden();
});
