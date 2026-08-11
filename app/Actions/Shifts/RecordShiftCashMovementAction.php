<?php

namespace App\Actions\Shifts;

use App\Models\Shift;
use App\Models\ShiftCashMovement;
use App\Models\User;
use Illuminate\Validation\ValidationException;

class RecordShiftCashMovementAction
{
    public function execute(User $user, Shift $shift, array $data): ShiftCashMovement
    {
        if ($shift->status !== 'open' || $shift->register()->where('branch_id', $user->branch_id)->doesntExist()) {
            throw ValidationException::withMessages(['shift' => 'Chỉ được thu/chi trên ca đang mở tại chi nhánh hiện tại.']);
        }

        return ShiftCashMovement::query()->create(['shift_id' => $shift->id, 'user_id' => $user->id, ...$data]);
    }
}
