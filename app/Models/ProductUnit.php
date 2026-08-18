<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ProductUnit extends Model
{
    protected $fillable = ['product_variant_id', 'unit_id', 'conversion_to_base', 'sale_price', 'is_base', 'is_default_sale', 'allows_fractional_quantity', 'is_active'];

    protected function casts(): array
    {
        return ['conversion_to_base' => 'decimal:6', 'sale_price' => 'integer', 'is_base' => 'boolean', 'is_default_sale' => 'boolean', 'allows_fractional_quantity' => 'boolean', 'is_active' => 'boolean'];
    }

    public function variant(): BelongsTo
    {
        return $this->belongsTo(ProductVariant::class, 'product_variant_id');
    }

    public function unit(): BelongsTo
    {
        return $this->belongsTo(Unit::class);
    }

    public function barcodes(): HasMany
    {
        return $this->hasMany(Barcode::class);
    }
}
