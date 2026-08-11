<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Payment extends Model
{
    protected $fillable = ['sale_id', 'customer_id', 'shift_id', 'user_id', 'method', 'direction', 'amount', 'status', 'reference', 'manually_confirmed', 'paid_at'];

    protected function casts(): array
    {
        return ['amount' => 'integer', 'manually_confirmed' => 'boolean', 'paid_at' => 'datetime'];
    }

    public function sale(): BelongsTo
    {
        return $this->belongsTo(Sale::class);
    }
}
