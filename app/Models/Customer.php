<?php

namespace App\Models;

use App\Support\VietnameseSearch;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Customer extends Model
{
    protected $fillable = ['organization_id', 'code', 'name', 'phone', 'address', 'note', 'credit_limit', 'default_due_date', 'is_active'];

    protected function casts(): array
    {
        return ['credit_limit' => 'integer', 'default_due_date' => 'date', 'is_active' => 'boolean'];
    }

    protected static function booted(): void
    {
        static::saving(function (self $customer): void {
            $customer->search_text = VietnameseSearch::combine($customer->name, $customer->code, $customer->phone);
        });
    }

    public function creditEntries(): HasMany
    {
        return $this->hasMany(CustomerCreditEntry::class);
    }

    public function getBalanceAttribute(): int
    {
        return (int) $this->creditEntries()->sum('debit') - (int) $this->creditEntries()->sum('credit');
    }
}
