<?php

namespace App\Actions\Shifts;

use App\Models\Payment;
use App\Models\Shift;
use App\Models\ShiftCashCount;
use App\Models\User;
use App\Services\ResourceVersionService;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CloseShiftAction
{
    public function __construct(private readonly ResourceVersionService $resourceVersions) {}

    public function execute(User $user, Shift $shift, array $data): Shift
    {
        return DB::transaction(function () use ($user, $shift, $data) {
            $shift = Shift::query()->whereKey($shift->id)->lockForUpdate()->firstOrFail();
            abort_unless($shift->register()->where('branch_id', $user->branch_id)->exists(), 403);
            if ($shift->status !== 'open') {
                throw ValidationException::withMessages(['shift' => 'Ca đã được đóng trước đó.']);
            }

            $cashInPayments = (int) Payment::query()->where('shift_id', $shift->id)->where('method', 'cash')->where('direction', 'in')->where('status', 'confirmed')->sum('amount');
            $cashOutPayments = (int) Payment::query()->where('shift_id', $shift->id)->where('method', 'cash')->where('direction', 'out')->where('status', 'confirmed')->sum('amount');
            $cashIn = (int) $shift->cashMovements()->where('type', 'in')->sum('amount');
            $cashOut = (int) $shift->cashMovements()->where('type', 'out')->sum('amount');
            $expected = (int) $shift->opening_cash + $cashInPayments - $cashOutPayments + $cashIn - $cashOut;

            foreach ($data['counts'] ?? [] as $count) {
                ShiftCashCount::query()->updateOrCreate(
                    ['shift_id' => $shift->id, 'denomination' => $count['denomination']],
                    ['user_id' => $user->id, 'quantity' => $count['quantity'], 'subtotal' => $count['denomination'] * $count['quantity']],
                );
            }

            $shift->update([
                'closed_by' => $user->id,
                'status' => 'closed',
                'expected_cash' => $expected,
                'actual_cash' => $data['actual_cash'],
                'difference_cash' => $data['actual_cash'] - $expected,
                'closed_at' => now(),
                'closing_note' => $data['closing_note'] ?? null,
            ]);
            $this->resourceVersions->bumpAfterCommit($user, ['activeShift']);

            return $shift->fresh();
        });
    }
}
