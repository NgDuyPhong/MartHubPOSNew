<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ShiftCashCount extends Model
{
    protected $fillable = ['shift_id', 'user_id', 'denomination', 'quantity', 'subtotal'];

    protected function casts(): array
    {
        return ['denomination' => 'integer', 'quantity' => 'integer', 'subtotal' => 'integer'];
    }
}
