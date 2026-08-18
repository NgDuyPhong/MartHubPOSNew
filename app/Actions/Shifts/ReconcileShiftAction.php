<?php

namespace App\Actions\Shifts;

use App\Models\Shift;
use App\Models\User;
use App\Services\ResourceVersionService;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ReconcileShiftAction
{
    public function __construct(private readonly ResourceVersionService $resourceVersions) {}

    public function execute(User $user, Shift $shift, array $data): Shift
    {
        return DB::transaction(function () use ($user, $shift, $data): Shift {
            $lockedShift = Shift::query()->whereKey($shift->id)->lockForUpdate()->firstOrFail();
            abort_unless($lockedShift->register()->where('branch_id', $user->branch_id)->exists(), 403);

            if ($lockedShift->status !== 'closed' || ! $lockedShift->needs_reconciliation) {
                throw ValidationException::withMessages(['shift' => 'Ca này không có đối soát đang chờ xử lý.']);
            }
            if ((int) ($lockedShift->difference_cash ?? 0) !== 0 && trim((string) ($data['reconciliation_note'] ?? '')) === '') {
                throw ValidationException::withMessages(['reconciliation_note' => 'Cần ghi chú khi ca còn chênh lệch tiền mặt.']);
            }

            $lockedShift->update([
                'needs_reconciliation' => false,
                'reconciled_at' => now(),
                'reconciled_by' => $user->id,
                'reconciliation_note' => $data['reconciliation_note'] ?? $lockedShift->reconciliation_note,
            ]);
            $this->resourceVersions->bumpAfterCommit($user, ['activeShift']);

            return $lockedShift->fresh();
        });
    }
}
