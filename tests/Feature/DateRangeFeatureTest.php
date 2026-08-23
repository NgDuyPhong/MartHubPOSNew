<?php

use App\Models\Branch;
use App\Models\Organization;
use App\Models\Register;
use App\Models\Sale;
use App\Models\Shift;
use App\Models\User;
use App\Support\OrganizationDateRange;
use Illuminate\Support\Str;

function dateRangeUser(string $timezone = 'Asia/Ho_Chi_Minh'): array
{
    $organization = Organization::query()->create([
        'code' => Str::upper(Str::random(8)),
        'name' => 'Date Range Test',
        'timezone' => $timezone,
    ]);
    $branch = Branch::query()->create(['organization_id' => $organization->id, 'code' => 'MAIN', 'name' => 'Cửa hàng chính']);
    $user = User::factory()->create([
        'organization_id' => $organization->id,
        'branch_id' => $branch->id,
        'role' => 'owner',
        'is_active' => true,
    ]);

    return [$organization, $user];
}

test('local organization dates become UTC half-open boundaries', function () {
    $range = OrganizationDateRange::fromLocalDates('2026-08-20', '2026-08-20', 'Asia/Ho_Chi_Minh');

    expect($range->fromUtc?->toIso8601String())->toBe('2026-08-19T17:00:00+00:00')
        ->and($range->toExclusiveUtc?->toIso8601String())->toBe('2026-08-20T17:00:00+00:00');
});

test('date range supports from-only and to-only filters', function () {
    $fromOnly = OrganizationDateRange::fromLocalDates('2026-08-20', null, 'Asia/Ho_Chi_Minh');
    $toOnly = OrganizationDateRange::fromLocalDates(null, '2026-08-20', 'Asia/Ho_Chi_Minh');

    expect($fromOnly->fromUtc)->not->toBeNull()
        ->and($fromOnly->toExclusiveUtc)->toBeNull()
        ->and($toOnly->fromUtc)->toBeNull()
        ->and($toOnly->toExclusiveUtc)->not->toBeNull();
});

test('sales rejects reversed date ranges at the request boundary', function () {
    [, $user] = dateRangeUser();

    $this->actingAs($user)
        ->get(route('sales.index', ['from' => '2026-08-20', 'to' => '2026-08-01']))
        ->assertSessionHasErrors('to');
});

test('sales rejects malformed date filters at the request boundary', function () {
    [, $user] = dateRangeUser();

    $this->actingAs($user)
        ->get(route('sales.index', ['from' => '20-08-2026']))
        ->assertSessionHasErrors('from');
});

test('shifts accepts a valid date range and preserves it in inertia filters', function () {
    [, $user] = dateRangeUser();

    $this->actingAs($user)
        ->get(route('shifts.index', ['from' => '2026-08-01', 'to' => '2026-08-20']))
        ->assertInertia(fn ($page) => $page
            ->where('filters.from', '2026-08-01')
            ->where('filters.to', '2026-08-20')
            ->where('organization.timezone', 'Asia/Ho_Chi_Minh'));
});

test('sales use organization timezone boundaries and keep pagination filters', function () {
    [, $user] = dateRangeUser('America/New_York');
    $register = Register::query()->create(['branch_id' => $user->branch_id, 'code' => 'POS-SALES', 'name' => 'Quầy bán hàng', 'is_active' => true]);
    $shift = Shift::query()->create([
        'register_id' => $register->id,
        'opened_by' => $user->id,
        'code' => 'CA-SALES',
        'status' => 'open',
        'opening_cash' => 0,
        'opened_at' => '2026-08-20 04:00:00',
    ]);

    $saleData = [
        'public_id' => Str::uuid()->toString(),
        'branch_id' => $user->branch_id,
        'shift_id' => $shift->id,
        'user_id' => $user->id,
        'status' => 'completed',
        'source' => 'online',
        'subtotal' => 1000,
        'total' => 1000,
        'sold_at' => '2026-08-20 03:59:59',
    ];
    Sale::query()->create([...$saleData, 'invoice_number' => 'HD-OUTSIDE']);
    Sale::query()->create([...$saleData, 'public_id' => Str::uuid()->toString(), 'invoice_number' => 'HD-INSIDE', 'sold_at' => '2026-08-20 04:00:00']);

    $this->actingAs($user)
        ->get(route('sales.index', ['from' => '2026-08-20', 'to' => '2026-08-20', 'per_page' => 25]))
        ->assertInertia(fn ($page) => $page
            ->where('sales.total', 1)
            ->where('filters.per_page', 25)
            ->where('organization.timezone', 'America/New_York')
            ->where('sales.links', fn ($links) => collect($links)->contains(
                fn ($link) => is_string($link['url'] ?? null) && str_contains($link['url'], 'from=2026-08-20') && str_contains($link['url'], 'to=2026-08-20'),
            )));
});

test('sales support from-only and to-only organization date filters', function () {
    [, $user] = dateRangeUser('America/New_York');
    $register = Register::query()->create(['branch_id' => $user->branch_id, 'code' => 'POS-SALES-RANGE', 'name' => 'Quầy bán hàng', 'is_active' => true]);
    $shift = Shift::query()->create([
        'register_id' => $register->id,
        'opened_by' => $user->id,
        'code' => 'CA-SALES-RANGE',
        'status' => 'open',
        'opening_cash' => 0,
        'opened_at' => '2026-08-20 04:00:00',
    ]);
    $baseSale = [
        'branch_id' => $user->branch_id,
        'shift_id' => $shift->id,
        'user_id' => $user->id,
        'status' => 'completed',
        'source' => 'online',
        'subtotal' => 1000,
        'total' => 1000,
    ];
    Sale::query()->create([...$baseSale, 'public_id' => Str::uuid()->toString(), 'invoice_number' => 'HD-FROM-IN', 'sold_at' => '2026-08-20 04:00:00']);
    Sale::query()->create([...$baseSale, 'public_id' => Str::uuid()->toString(), 'invoice_number' => 'HD-TO-OUT', 'sold_at' => '2026-08-21 04:00:00']);

    $this->actingAs($user)
        ->get(route('sales.index', ['from' => '2026-08-20']))
        ->assertInertia(fn ($page) => $page
            ->where('sales.total', 2)
            ->where('filters.from', '2026-08-20')
            ->where('filters.to', null));

    $this->actingAs($user)
        ->get(route('sales.index', ['to' => '2026-08-20']))
        ->assertInertia(fn ($page) => $page
            ->where('sales.total', 1)
            ->where('filters.from', null)
            ->where('filters.to', '2026-08-20'));
});

test('shifts use organization timezone boundaries', function () {
    [, $user] = dateRangeUser('America/New_York');
    $register = Register::query()->create(['branch_id' => $user->branch_id, 'code' => 'POS-SHIFTS', 'name' => 'Quầy ca', 'is_active' => true]);
    Shift::query()->create([
        'register_id' => $register->id,
        'opened_by' => $user->id,
        'code' => 'CA-OUTSIDE',
        'status' => 'closed',
        'opening_cash' => 0,
        'opened_at' => '2026-08-20 03:59:59',
    ]);
    Shift::query()->create([
        'register_id' => $register->id,
        'opened_by' => $user->id,
        'code' => 'CA-INSIDE',
        'status' => 'closed',
        'opening_cash' => 0,
        'opened_at' => '2026-08-20 04:00:00',
    ]);

    $this->actingAs($user)
        ->get(route('shifts.index', ['from' => '2026-08-20', 'to' => '2026-08-20']))
        ->assertInertia(fn ($page) => $page
            ->where('shifts.total', 1)
            ->where('shifts.data.0.code', 'CA-INSIDE')
            ->where('organization.timezone', 'America/New_York'));
});

test('shifts preserve from-only and to-only filters', function () {
    [, $user] = dateRangeUser('America/New_York');
    $register = Register::query()->create(['branch_id' => $user->branch_id, 'code' => 'POS-SHIFTS-RANGE', 'name' => 'Quầy ca', 'is_active' => true]);
    Shift::query()->create([
        'register_id' => $register->id,
        'opened_by' => $user->id,
        'code' => 'CA-RANGE-IN',
        'status' => 'closed',
        'opening_cash' => 0,
        'opened_at' => '2026-08-20 04:00:00',
    ]);
    Shift::query()->create([
        'register_id' => $register->id,
        'opened_by' => $user->id,
        'code' => 'CA-RANGE-OUT',
        'status' => 'closed',
        'opening_cash' => 0,
        'opened_at' => '2026-08-21 04:00:00',
    ]);

    $this->actingAs($user)
        ->get(route('shifts.index', ['from' => '2026-08-20']))
        ->assertInertia(fn ($page) => $page->where('shifts.total', 2)->where('filters.from', '2026-08-20')->where('filters.to', null));

    $this->actingAs($user)
        ->get(route('shifts.index', ['to' => '2026-08-20']))
        ->assertInertia(fn ($page) => $page->where('shifts.total', 1)->where('filters.from', null)->where('filters.to', '2026-08-20'));
});

test('shared organization timezone falls back to application timezone without an organization', function () {
    $user = User::factory()->create(['organization_id' => null, 'branch_id' => null, 'role' => 'owner', 'is_active' => true]);

    $this->actingAs($user)
        ->get(route('dashboard'))
        ->assertInertia(fn ($page) => $page->where('organization.timezone', config('app.timezone')));
});
