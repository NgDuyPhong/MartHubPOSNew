<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Sale extends Model
{
    protected $fillable = ['public_id', 'branch_id', 'shift_id', 'user_id', 'customer_id', 'invoice_number', 'status', 'source', 'subtotal', 'discount_amount', 'total', 'paid_amount', 'debt_amount', 'change_amount', 'note', 'sold_at', 'synced_at'];

    protected function casts(): array
    {
        return ['subtotal' => 'integer', 'discount_amount' => 'integer', 'total' => 'integer', 'paid_amount' => 'integer', 'debt_amount' => 'integer', 'change_amount' => 'integer', 'sold_at' => 'datetime', 'synced_at' => 'datetime'];
    }

    public function items(): HasMany
    {
        return $this->hasMany(SaleItem::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function shift(): BelongsTo
    {
        return $this->belongsTo(Shift::class);
    }
}
