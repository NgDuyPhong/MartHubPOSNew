<?php

use App\Models\Branch;
use App\Models\Organization;
use App\Models\User;

test('cashiers cannot access catalog management pages', function () {
    $organization = Organization::query()->create(['code' => 'AUTH-ORG', 'name' => 'Auth Test']);
    $branch = Branch::query()->create(['organization_id' => $organization->id, 'code' => 'MAIN', 'name' => 'Cửa hàng chính']);
    $cashier = User::factory()->create([
        'organization_id' => $organization->id,
        'branch_id' => $branch->id,
        'role' => 'cashier',
        'is_active' => true,
    ]);

    $this->actingAs($cashier)->get(route('products.index'))->assertForbidden();
});

test('capabilities are inactive when the account is inactive', function () {
    $user = User::factory()->create(['role' => 'owner', 'is_active' => false]);

    expect($user->capabilities())->toBeEmpty()
        ->and($user->hasCapability('catalog.manage'))->toBeFalse();
});
