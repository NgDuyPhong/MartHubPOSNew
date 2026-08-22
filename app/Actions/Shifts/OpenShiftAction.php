<?php

namespace App\Actions\Shifts;

use App\Models\Register;
use App\Models\Shift;
use App\Models\ShiftParticipant;
use App\Models\User;
use App\Services\ResourceVersionService;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class OpenShiftAction
{
    public function __construct(private readonly ResourceVersionService $resourceVersions) {}

    public function execute(User $user, array $data): Shift
    {
        return DB::transaction(function () use ($user, $data) {
            $activeRegisterCount = Register::query()->where('branch_id', $user->branch_id)->where('is_active', true)->count();
            if ($activeRegisterCount !== 1) {
                throw ValidationException::withMessages(['register_id' => 'Chi nhánh phải có đúng một quầy hoạt động trước khi mở ca.']);
            }

            $register = Register::query()
                ->whereKey($data['register_id'])
                ->where('branch_id', $user->branch_id)
                ->where('is_active', true)
                ->lockForUpdate()
                ->firstOrFail();

            if (Shift::query()->where('register_id', $register->id)->where('status', 'open')->exists()) {
                throw ValidationException::withMessages(['register_id' => 'Quầy này đang có một ca mở.']);
            }

            $shift = Shift::query()->create([
                'register_id' => $register->id,
                'opened_by' => $user->id,
                'code' => 'CA-'.now()->format('Ymd-His'),
                'status' => 'open',
                'opening_cash' => $data['opening_cash'],
                'opened_at' => now(),
            ]);

            ShiftParticipant::query()->create(['shift_id' => $shift->id, 'user_id' => $user->id, 'joined_at' => now()]);
            $this->resourceVersions->bumpAfterCommit($user, ['activeShift']);

            return $shift;
        });
    }
}
