<?php

use App\Models\Branch;
use App\Models\Organization;
use App\Models\User;
use App\Services\ResourceVersionService;
use Illuminate\Support\Str;

function freshnessFixture(): array
{
    $organization = Organization::query()->create(['code' => Str::upper(Str::random(8)), 'name' => 'Freshness Test']);
    $branch = Branch::query()->create(['organization_id' => $organization->id, 'code' => 'MAIN', 'name' => 'Cửa hàng chính']);
    $user = User::factory()->create(['organization_id' => $organization->id, 'branch_id' => $branch->id, 'role' => 'owner', 'is_active' => true]);

    return compact('organization', 'branch', 'user');
}

test('freshness and snapshot are scoped to the authenticated organization and branch', function () {
    $fixture = freshnessFixture();

    $this->actingAs($fixture['user'])->getJson(route('pos.freshness'))->assertSuccessful()->assertJson([
        'versions' => ['catalog' => '1', 'inventory' => '1', 'customers' => '1', 'activeShift' => '1'],
        'changed' => ['catalog', 'inventory', 'customers', 'activeShift'],
    ]);

    $response = $this->actingAs($fixture['user'])->getJson(route('pos.snapshot', ['resources' => 'catalog,categories,customers']));
    $response->assertSuccessful()->assertJsonPath('key', $fixture['organization']->id.':'.$fixture['branch']->id)->assertJsonPath('snapshotScope.organizationId', $fixture['organization']->id)->assertJsonPath('snapshotScope.branchId', $fixture['branch']->id);

    $etag = $response->headers->get('ETag');
    expect($etag)->not->toBeNull();
    $this->actingAs($fixture['user'])->withHeaders(['If-None-Match' => $etag])->getJson(route('pos.snapshot', ['resources' => 'catalog,categories,customers']))->assertNotModified();
});

test('snapshot rejects resources outside the whitelist and does not accept a client scope', function () {
    $fixture = freshnessFixture();

    $this->actingAs($fixture['user'])->getJson(route('pos.snapshot', ['resources' => 'organization,customers']))->assertUnprocessable()->assertJsonPath('resources.0', 'organization');
    $this->actingAs($fixture['user'])->getJson(route('pos.snapshot', ['resources' => 'catalog', 'organization_id' => 999, 'branch_id' => 999]))->assertSuccessful()->assertJsonPath('snapshotScope.organizationId', $fixture['organization']->id)->assertJsonPath('snapshotScope.branchId', $fixture['branch']->id);
});

test('resource versions bump independently by scope', function () {
    $fixture = freshnessFixture();
    $service = app(ResourceVersionService::class);

    $service->bump(['catalog', 'customers'], $fixture['organization']->id, $fixture['branch']->id);

    $this->actingAs($fixture['user'])->getJson(route('pos.freshness'))->assertJson([
        'versions' => ['catalog' => '2', 'inventory' => '1', 'customers' => '2', 'activeShift' => '1'],
    ]);
});
