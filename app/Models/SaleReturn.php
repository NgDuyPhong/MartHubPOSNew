<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SaleReturn extends Model
{
    protected $fillable = ['public_id', 'sale_id', 'shift_id', 'user_id', 'return_number', 'type', 'total', 'refund_method', 'reason', 'returned_at'];

    protected function casts(): array
    {
        return ['total' => 'integer', 'returned_at' => 'datetime'];
    }

    public function items(): HasMany
    {
        return $this->hasMany(SaleReturnItem::class);
    }
}
