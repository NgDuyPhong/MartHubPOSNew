<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ShiftCashMovement extends Model
{
    protected $fillable = ['shift_id', 'user_id', 'type', 'amount', 'reason'];

    protected function casts(): array
    {
        return ['amount' => 'integer'];
    }
}
