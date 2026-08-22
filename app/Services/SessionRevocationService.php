<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use LogicException;

class SessionRevocationService
{
    /**
     * Revoke server-side database sessions for a user.
     *
     * Cookie sessions have no server-side row to delete; callers must rotate
     * the user's remember token separately, and existing cookie sessions still
     * require a session-version mechanism before they can be fully revoked.
     */
    public function revokeFor(User $user): void
    {
        $driver = (string) config('session.driver');
        if (in_array($driver, ['array', 'cookie'], true)) {
            return;
        }
        if ($driver !== 'database') {
            throw new LogicException('Session revocation only supports the database session driver.');
        }

        $connection = config('session.connection');
        $table = (string) config('session.table', 'sessions');

        DB::connection($connection)->table($table)->where('user_id', $user->getKey())->delete();
    }
}
