<?php

use App\Models\Branch;
use App\Models\Organization;
use App\Models\Register;
use App\Models\Shift;
use App\Models\User;
use Illuminate\Support\Str;

function shiftFixture(): array
{
    $organization = Organization::query()->create(['code' => Str::upper(Str::random(8)), 'name' => 'Shift Test']);
    $branch = Branch::query()->create(['organization_id' => $organization->id, 'code' => 'MAIN', 'name' => 'Cửa hàng chính']);
    $user = User::factory()->create(['organization_id' => $organization->id, 'branch_id' => $branch->id, 'role' => 'owner', 'is_active' => true]);
    $register = Register::query()->create(['branch_id' => $branch->id, 'code' => 'POS-1', 'name' => 'Quầy 1', 'is_active' => true]);

    return compact('organization', 'branch', 'user', 'register');
}

test('a register cannot have two open shifts', function () {
    $fixture = shiftFixture();
    Shift::query()->create([
        'register_id' => $fixture['register']->id,
        'opened_by' => $fixture['user']->id,
        'code' => 'CA-OPEN',
        'status' => 'open',
        'opening_cash' => 100000,
        'opened_at' => now(),
    ]);

    $this->actingAs($fixture['user'])->post(route('shifts.store'), [
        'register_id' => $fixture['register']->id,
        'opening_cash' => 0,
    ])->assertSessionHasErrors('register_id');

    expect(Shift::query()->where('register_id', $fixture['register']->id)->where('status', 'open')->count())->toBe(1);
});

test('pos active shift exposes register, opener and opened time', function () {
    $fixture = shiftFixture();
    Shift::query()->create([
        'register_id' => $fixture['register']->id,
        'opened_by' => $fixture['user']->id,
        'code' => 'CA-OPEN',
        'status' => 'open',
        'opening_cash' => 100000,
        'opened_at' => now(),
    ]);

    $this->actingAs($fixture['user'])->get(route('pos'))->assertInertia(fn ($page) => $page
        ->where('activeShift.code', 'CA-OPEN')
        ->where('activeShift.register.name', 'Quầy 1')
        ->where('activeShift.opened_by.name', $fixture['user']->name)
        ->has('activeShift.opened_at'));
});

test('pos fails closed when a branch has multiple active registers', function () {
    $fixture = shiftFixture();
    Register::query()->create(['branch_id' => $fixture['branch']->id, 'code' => 'POS-2', 'name' => 'Quầy 2', 'is_active' => true]);

    $this->actingAs($fixture['user'])->get(route('pos'))->assertInertia(fn ($page) => $page
        ->where('activeShift', null)
        ->where('registers', []));

    $this->actingAs($fixture['user'])->post(route('shifts.store'), [
        'register_id' => $fixture['register']->id,
        'opening_cash' => 0,
    ])->assertSessionHasErrors('register_id');
});
