<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class InventoryMovement extends Model
{
    protected $fillable = ['branch_id', 'product_variant_id', 'inventory_lot_id', 'user_id', 'type', 'quantity_base', 'balance_after', 'source_type', 'source_id', 'reason', 'metadata'];

    protected function casts(): array
    {
        return ['quantity_base' => 'decimal:6', 'balance_after' => 'decimal:6', 'metadata' => 'array'];
    }
}
