<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class InventoryLot extends Model
{
    protected $fillable = ['branch_id', 'product_variant_id', 'lot_number', 'expiry_date', 'received_date', 'is_active'];

    protected function casts(): array
    {
        return ['expiry_date' => 'date', 'received_date' => 'date', 'is_active' => 'boolean'];
    }

    public function productVariant(): BelongsTo
    {
        return $this->belongsTo(ProductVariant::class);
    }

    public function balances(): HasMany
    {
        return $this->hasMany(InventoryBalance::class);
    }
}
