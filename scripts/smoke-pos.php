<?php

use App\Actions\Customers\RecordDebtPaymentAction;
use App\Actions\Returns\CreateSaleReturnAction;
use App\Actions\Sales\CreateSaleAction;
use App\Actions\Shifts\CloseShiftAction;
use App\Actions\Shifts\OpenShiftAction;
use App\Actions\Shifts\RecordShiftCashMovementAction;
use App\Models\Customer;
use App\Models\ProductUnit;
use App\Models\Register;
use App\Models\User;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

require dirname(__DIR__).'/vendor/autoload.php';
$app = require dirname(__DIR__).'/bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();

DB::beginTransaction();

try {
    $user = User::query()->where('email', 'owner@marthub.local')->firstOrFail();
    $customer = Customer::query()->create([
        'organization_id' => $user->organization_id,
        'code' => 'SMOKE',
        'name' => 'Khách smoke',
        'is_active' => true,
    ]);
    $register = Register::query()->where('branch_id', $user->branch_id)->firstOrFail();
    $shift = app(OpenShiftAction::class)->execute($user, ['register_id' => $register->id, 'opening_cash' => 100000]);
    $unit = ProductUnit::query()->where('is_base', true)->firstOrFail();
    $sale = app(CreateSaleAction::class)->execute($user, [
        'idempotency_key' => (string) Str::uuid(),
        'shift_id' => $shift->id,
        'customer_id' => $customer->id,
        'source' => 'online',
        'items' => [['product_unit_id' => $unit->id, 'quantity' => 2]],
        'payments' => [['method' => 'cash', 'amount' => 10000]],
    ]);
    throw_unless($sale->debt_amount === 10000, RuntimeException::class, 'Debt calculation failed.');

    app(RecordDebtPaymentAction::class)->execute($user, $customer, ['shift_id' => $shift->id, 'method' => 'cash', 'amount' => 5000]);
    app(RecordShiftCashMovementAction::class)->execute($user, $shift, ['type' => 'out', 'amount' => 5000, 'reason' => 'Smoke expense']);

    $offlineOverrideRejected = false;
    try {
        app(CreateSaleAction::class)->execute($user, [
            'idempotency_key' => (string) Str::uuid(),
            'shift_id' => $shift->id,
            'source' => 'offline_sync',
            'items' => [['product_unit_id' => $unit->id, 'quantity' => 1, 'unit_price' => $unit->sale_price - 1000]],
            'payments' => [['method' => 'cash', 'amount' => $unit->sale_price]],
        ]);
    } catch (ValidationException) {
        $offlineOverrideRejected = true;
    }
    throw_unless($offlineOverrideRejected, RuntimeException::class, 'Offline override was not rejected.');

    $return = app(CreateSaleReturnAction::class)->execute($user, $sale, [
        'shift_id' => $shift->id,
        'type' => 'refund',
        'refund_method' => 'debt',
        'reason' => 'Smoke return',
        'items' => [['sale_item_id' => $sale->items->first()->id, 'quantity' => 1, 'condition' => 'resellable']],
    ]);
    $closed = app(CloseShiftAction::class)->execute($user, $shift, ['actual_cash' => 105000]);
    throw_unless($closed->difference_cash === 0, RuntimeException::class, 'Shift cash reconciliation failed.');

    echo "sale={$sale->invoice_number}; debt={$sale->debt_amount}; return={$return->return_number}; shift={$closed->status}".PHP_EOL;
} finally {
    DB::rollBack();
}
