<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SaleReturnItem extends Model
{
    protected $fillable = ['sale_return_id', 'sale_item_id', 'quantity', 'quantity_base', 'refund_amount', 'condition'];

    protected function casts(): array
    {
        return ['quantity' => 'decimal:6', 'quantity_base' => 'decimal:6', 'refund_amount' => 'integer'];
    }
}
