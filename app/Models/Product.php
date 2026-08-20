<?php

namespace App\Models;

use App\Services\ProductImageService;
use App\Support\VietnameseSearch;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Product extends Model
{
    protected $fillable = ['organization_id', 'category_id', 'sku', 'name', 'image_path', 'external_image_url', 'track_lot', 'track_expiry', 'is_active'];

    protected $appends = ['image_url', 'image_source'];

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

    public function getImageUrlAttribute(): ?string
    {
        return $this->image_path !== null
            ? app(ProductImageService::class)->url($this->image_path)
            : $this->external_image_url;
    }

    public function getImageSourceAttribute(): string
    {
        return match (true) {
            $this->image_path !== null => 'upload',
            $this->external_image_url !== null => 'external',
            default => 'none',
        };
    }
}
