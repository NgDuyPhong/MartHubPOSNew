<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ShiftParticipant extends Model
{
    protected $fillable = ['shift_id', 'user_id', 'joined_at', 'left_at'];

    protected function casts(): array
    {
        return ['joined_at' => 'datetime', 'left_at' => 'datetime'];
    }
}
