<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SaleItem extends Model
{
    protected $fillable = ['sale_id', 'product_variant_id', 'product_unit_id', 'product_sku', 'product_name', 'variant_name', 'unit_code', 'unit_name', 'conversion_to_base', 'quantity', 'quantity_base', 'unit_price', 'original_unit_price', 'discount_amount', 'line_total', 'cost_base_snapshot', 'cost_total_snapshot', 'price_overridden'];

    protected function casts(): array
    {
        return ['conversion_to_base' => 'decimal:6', 'quantity' => 'decimal:6', 'quantity_base' => 'decimal:6', 'unit_price' => 'integer', 'original_unit_price' => 'integer', 'discount_amount' => 'integer', 'line_total' => 'integer', 'cost_base_snapshot' => 'integer', 'cost_total_snapshot' => 'integer', 'price_overridden' => 'boolean'];
    }

    public function sale(): BelongsTo
    {
        return $this->belongsTo(Sale::class);
    }

    public function returnItems(): HasMany
    {
        return $this->hasMany(SaleReturnItem::class);
    }
}
