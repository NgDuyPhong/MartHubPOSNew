<?php

use App\Models\Branch;
use App\Models\Organization;
use App\Models\Product;
use App\Models\ProductUnit;
use App\Models\ProductVariant;
use App\Models\Register;
use App\Models\Shift;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

function saleFixture(bool $allowsFractional = false): array
{
    $organization = Organization::query()->create(['code' => Str::upper(Str::random(8)), 'name' => 'POS Test']);
    $branch = Branch::query()->create(['organization_id' => $organization->id, 'code' => 'MAIN', 'name' => 'Cửa hàng chính']);
    $user = User::factory()->create(['organization_id' => $organization->id, 'branch_id' => $branch->id, 'role' => 'owner', 'is_active' => true]);
    $register = Register::query()->create(['branch_id' => $branch->id, 'code' => 'POS-1', 'name' => 'Quầy 1', 'is_active' => true]);
    $shift = Shift::query()->create(['register_id' => $register->id, 'opened_by' => $user->id, 'code' => 'CA-'.Str::random(6), 'status' => 'open', 'opening_cash' => 0, 'opened_at' => now()]);
    $unit = Unit::query()->create(['organization_id' => $organization->id, 'code' => 'KG', 'name' => 'Kilogram']);
    $product = Product::query()->create(['organization_id' => $organization->id, 'sku' => 'SKU-'.Str::random(6), 'name' => 'Cà phê', 'is_active' => true]);
    $variant = ProductVariant::query()->create(['product_id' => $product->id, 'name' => 'Mặc định', 'sku' => $product->sku, 'last_cost_base' => 1000, 'is_active' => true]);
    $productUnit = ProductUnit::query()->create(['product_variant_id' => $variant->id, 'unit_id' => $unit->id, 'conversion_to_base' => 1, 'sale_price' => 10000, 'is_base' => true, 'is_default_sale' => true, 'allows_fractional_quantity' => $allowsFractional, 'is_active' => true]);

    return compact('organization', 'branch', 'user', 'shift', 'productUnit');
}

test('sale rejects fractional quantity for a packaged unit', function () {
    $fixture = saleFixture();

    $response = $this->actingAs($fixture['user'])->postJson(route('sales.store'), [
        'idempotency_key' => (string) Str::uuid(),
        'shift_id' => $fixture['shift']->id,
        'source' => 'online',
        'items' => [['product_unit_id' => $fixture['productUnit']->id, 'quantity' => 1.5]],
        'payments' => [['method' => 'cash', 'amount' => 15000]],
    ]);

    $response->assertUnprocessable()->assertJsonValidationErrors('items.0.quantity');
    expect($fixture['shift']->sales()->count())->toBe(0);
});

test('fractional quantity is accepted when the unit policy allows it', function () {
    $fixture = saleFixture(true);

    $response = $this->actingAs($fixture['user'])->postJson(route('sales.store'), [
        'idempotency_key' => (string) Str::uuid(),
        'shift_id' => $fixture['shift']->id,
        'source' => 'online',
        'items' => [['product_unit_id' => $fixture['productUnit']->id, 'quantity' => 1.5]],
        'payments' => [['method' => 'cash', 'amount' => 15000]],
    ]);

    $response->assertCreated();
    expect($response->json('sale.items.0.quantity'))->toBe('1.500000');
});

test('sale keeps the cart price snapshot when the master price changed', function () {
    $fixture = saleFixture();
    $fixture['user']->update(['approval_pin_hash' => Hash::make('1234')]);
    $fixture['productUnit']->update(['sale_price' => 12000]);

    $response = $this->actingAs($fixture['user'])->postJson(route('sales.store'), [
        'idempotency_key' => (string) Str::uuid(),
        'shift_id' => $fixture['shift']->id,
        'source' => 'online',
        'owner_pin' => '1234',
        'items' => [['product_unit_id' => $fixture['productUnit']->id, 'quantity' => 1, 'unit_price' => 10000]],
        'payments' => [['method' => 'cash', 'amount' => 10000]],
    ]);

    $response->assertCreated()->assertJsonPath('sale.items.0.unit_price', 10000)->assertJsonPath('sale.items.0.original_unit_price', 12000);
});

test('offline sale with a stale price is rejected until it is repriced online', function () {
    $fixture = saleFixture();
    $fixture['productUnit']->update(['sale_price' => 12000]);

    $response = $this->actingAs($fixture['user'])->postJson(route('sales.store'), [
        'idempotency_key' => (string) Str::uuid(),
        'shift_id' => $fixture['shift']->id,
        'source' => 'offline_sync',
        'occurred_at' => now()->toISOString(),
        'items' => [['product_unit_id' => $fixture['productUnit']->id, 'quantity' => 1, 'unit_price' => 10000]],
        'payments' => [['method' => 'cash', 'amount' => 10000]],
    ]);

    $response->assertUnprocessable()->assertJsonValidationErrors('owner_pin');
    expect($fixture['shift']->sales()->count())->toBe(0);
});
