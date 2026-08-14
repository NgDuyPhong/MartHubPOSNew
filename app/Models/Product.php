<?php

namespace App\Models;

use App\Support\VietnameseSearch;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Product extends Model
{
    protected $fillable = ['organization_id', 'category_id', 'sku', 'name', 'image_path', 'track_lot', 'track_expiry', 'is_active'];

    protected function casts(): array
    {
        return ['track_lot' => 'boolean', 'track_expiry' => 'boolean', 'is_active' => 'boolean'];
    }

    protected static function booted(): void
    {
        static::saving(function (self $product): void {
            $product->search_text = VietnameseSearch::combine($product->name, $product->sku);
        });
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function variants(): HasMany
    {
        return $this->hasMany(ProductVariant::class);
    }
}
