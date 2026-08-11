<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StockReceiptItem extends Model
{
    protected $fillable = ['stock_receipt_id', 'product_variant_id', 'product_unit_id', 'inventory_lot_id', 'quantity', 'conversion_to_base', 'quantity_base', 'unit_cost', 'cost_base', 'line_total', 'lot_number', 'expiry_date'];

    protected function casts(): array
    {
        return ['quantity' => 'decimal:6', 'conversion_to_base' => 'decimal:6', 'quantity_base' => 'decimal:6', 'unit_cost' => 'integer', 'cost_base' => 'integer', 'line_total' => 'integer', 'expiry_date' => 'date'];
    }
}
