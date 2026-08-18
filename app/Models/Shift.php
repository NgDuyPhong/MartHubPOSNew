<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Shift extends Model
{
    protected $fillable = ['register_id', 'opened_by', 'closed_by', 'code', 'status', 'opening_cash', 'expected_cash', 'actual_cash', 'difference_cash', 'opened_at', 'closed_at', 'closing_note', 'needs_reconciliation', 'reconciled_at', 'reconciled_by', 'reconciliation_note'];

    protected function casts(): array
    {
        return ['opening_cash' => 'integer', 'expected_cash' => 'integer', 'actual_cash' => 'integer', 'difference_cash' => 'integer', 'needs_reconciliation' => 'boolean', 'opened_at' => 'datetime', 'closed_at' => 'datetime', 'reconciled_at' => 'datetime'];
    }

    public function register(): BelongsTo
    {
        return $this->belongsTo(Register::class);
    }

    public function openedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'opened_by');
    }

    public function sales(): HasMany
    {
        return $this->hasMany(Sale::class);
    }

    public function cashMovements(): HasMany
    {
        return $this->hasMany(ShiftCashMovement::class);
    }

    public function reconciledBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reconciled_by');
    }
}
