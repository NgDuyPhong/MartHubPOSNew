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
use Illuminate\Support\Str;

function offlineFixture(): array
{
    $organization = Organization::query()->create(['code' => Str::upper(Str::random(8)), 'name' => 'Offline Test']);
    $branch = Branch::query()->create(['organization_id' => $organization->id, 'code' => 'MAIN', 'name' => 'Cửa hàng chính']);
    $user = User::factory()->create(['organization_id' => $organization->id, 'branch_id' => $branch->id, 'role' => 'owner', 'is_active' => true]);
    $register = Register::query()->create(['branch_id' => $branch->id, 'code' => 'POS-1', 'name' => 'Quầy 1', 'is_active' => true]);
    $openedAt = now()->subHours(2);
    $closedAt = now()->subHour();
    $shift = Shift::query()->create(['register_id' => $register->id, 'opened_by' => $user->id, 'closed_by' => $user->id, 'code' => 'CA-'.Str::random(6), 'status' => 'closed', 'opening_cash' => 0, 'expected_cash' => 0, 'actual_cash' => 0, 'difference_cash' => 0, 'opened_at' => $openedAt, 'closed_at' => $closedAt]);
    $unit = Unit::query()->create(['organization_id' => $organization->id, 'code' => 'CHAI', 'name' => 'Chai']);
    $product = Product::query()->create(['organization_id' => $organization->id, 'sku' => 'SKU-'.Str::random(6), 'name' => 'Nước suối', 'is_active' => true]);
    $variant = ProductVariant::query()->create(['product_id' => $product->id, 'name' => 'Mặc định', 'sku' => $product->sku, 'last_cost_base' => 1000, 'is_active' => true]);
    $productUnit = ProductUnit::query()->create(['product_variant_id' => $variant->id, 'unit_id' => $unit->id, 'conversion_to_base' => 1, 'sale_price' => 5000, 'is_base' => true, 'is_default_sale' => true, 'allows_fractional_quantity' => false, 'is_active' => true]);

    return compact('organization', 'branch', 'user', 'shift', 'productUnit', 'openedAt', 'closedAt');
}

test('offline sale sync keeps the original closed shift and flags reconciliation', function () {
    $fixture = offlineFixture();
    $key = (string) Str::uuid();
    $payload = [
        'idempotency_key' => $key,
        'shift_id' => $fixture['shift']->id,
        'source' => 'offline_sync',
        'occurred_at' => $fixture['closedAt']->copy()->subMinutes(20)->toISOString(),
        'queued_at' => now()->toISOString(),
        'items' => [['product_unit_id' => $fixture['productUnit']->id, 'quantity' => 1]],
        'payments' => [['method' => 'cash', 'amount' => 5000]],
    ];

    $response = $this->actingAs($fixture['user'])->postJson(route('sales.store'), $payload);

    $response->assertCreated();
    $sale = $fixture['shift']->sales()->firstOrFail();
    expect($sale->source)->toBe('offline_sync')
        ->and($sale->shift_id)->toBe($fixture['shift']->id)
        ->and($sale->synced_at)->not->toBeNull()
        ->and($fixture['shift']->refresh()->needs_reconciliation)->toBeTrue();

    $this->actingAs($fixture['user'])->postJson(route('sales.store'), $payload)->assertCreated();
    expect($fixture['shift']->sales()->count())->toBe(1);

    $this->actingAs($fixture['user'])->post(route('shifts.reconcile', $fixture['shift']), [
        'reconciliation_note' => 'Đã kiểm tra giao dịch đến muộn.',
    ])->assertRedirect();
    expect($fixture['shift']->refresh()->needs_reconciliation)->toBeFalse()
        ->and($fixture['shift']->reconciled_at)->not->toBeNull();
});

test('online sale cannot be written to a closed shift', function () {
    $fixture = offlineFixture();

    $this->actingAs($fixture['user'])->postJson(route('sales.store'), [
        'idempotency_key' => (string) Str::uuid(),
        'shift_id' => $fixture['shift']->id,
        'source' => 'online',
        'items' => [['product_unit_id' => $fixture['productUnit']->id, 'quantity' => 1]],
        'payments' => [['method' => 'cash', 'amount' => 5000]],
    ])->assertUnprocessable()->assertJsonValidationErrors('shift_id');
});

test('offline sale with another actor remains a recovery conflict', function () {
    $fixture = offlineFixture();
    $originalActor = User::factory()->create([
        'organization_id' => $fixture['organization']->id,
        'branch_id' => $fixture['branch']->id,
        'role' => 'cashier',
        'is_active' => true,
    ]);

    $payload = [
        'idempotency_key' => (string) Str::uuid(),
        'shift_id' => $fixture['shift']->id,
        'original_actor_id' => $originalActor->id,
        'source' => 'offline_sync',
        'occurred_at' => $fixture['closedAt']->copy()->subMinutes(20)->toISOString(),
        'items' => [['product_unit_id' => $fixture['productUnit']->id, 'quantity' => 1]],
        'payments' => [['method' => 'cash', 'amount' => 5000]],
    ];

    $this->actingAs($fixture['user'])->postJson(route('sales.store'), $payload)
        ->assertUnprocessable()
        ->assertJsonValidationErrors('original_actor_id');

    expect($fixture['shift']->sales()->count())->toBe(0);
});
