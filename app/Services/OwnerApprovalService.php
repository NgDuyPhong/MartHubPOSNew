<?php

namespace App\Services;

use App\Exceptions\OwnerApprovalRejectedException;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;

class OwnerApprovalService
{
    public function __construct(private readonly Request $request) {}

    public function verify(User $requester, ?string $pin, string $source, string $action = 'owner_approval'): User
    {
        if ($source !== 'online') {
            throw ValidationException::withMessages(['owner_pin' => 'Không thể duyệt sửa giá hoặc giảm giá khi POS đang offline. Vui lòng chờ kết nối lại.']);
        }

        $throttleKey = 'owner-pin:'.$requester->organization_id.':'.$requester->id.':'.$this->request->ip().':'.$action;
        if (RateLimiter::tooManyAttempts($throttleKey, 5)) {
            $validation = ValidationException::withMessages(['owner_pin' => 'Đã nhập sai PIN quá nhiều lần. Hãy thử lại sau '.RateLimiter::availableIn($throttleKey).' giây.']);

            throw new OwnerApprovalRejectedException($validation, $requester->id, $action, $source);
        }

        $owner = User::query()
            ->where('organization_id', $requester->organization_id)
            ->where('role', 'owner')
            ->where('is_active', true)
            ->whereNotNull('approval_pin_hash')
            ->get()
            ->first(fn (User $user) => Hash::check((string) $pin, $user->approval_pin_hash));

        if (! $owner) {
            RateLimiter::hit($throttleKey, 60);
            $validation = ValidationException::withMessages(['owner_pin' => 'PIN chủ cửa hàng không đúng.']);

            throw new OwnerApprovalRejectedException($validation, $requester->id, $action, $source);
        }

        RateLimiter::clear($throttleKey);

        return $owner;
    }
}
