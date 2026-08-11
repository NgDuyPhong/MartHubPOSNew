<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class OwnerApprovalService
{
    public function verify(User $requester, ?string $pin, string $source): User
    {
        if ($source !== 'online') {
            throw ValidationException::withMessages(['owner_pin' => 'Không thể duyệt sửa giá hoặc giảm giá khi POS đang offline. Vui lòng chờ kết nối lại.']);
        }

        $owner = User::query()
            ->where('organization_id', $requester->organization_id)
            ->where('role', 'owner')
            ->where('is_active', true)
            ->whereNotNull('approval_pin_hash')
            ->get()
            ->first(fn (User $user) => Hash::check((string) $pin, $user->approval_pin_hash));

        if (! $owner) {
            throw ValidationException::withMessages(['owner_pin' => 'PIN chủ cửa hàng không đúng.']);
        }

        return $owner;
    }
}
