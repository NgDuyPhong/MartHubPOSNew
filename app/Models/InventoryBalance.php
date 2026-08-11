<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InventoryBalance extends Model
{
    protected $fillable = ['branch_id', 'product_variant_id', 'inventory_lot_id', 'scope_key', 'quantity_base'];

    protected function casts(): array
    {
        return ['quantity_base' => 'decimal:6'];
    }

    public function variant(): BelongsTo
    {
        return $this->belongsTo(ProductVariant::class, 'product_variant_id');
    }
}
