<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CustomerCreditEntry extends Model
{
    protected $fillable = ['customer_id', 'user_id', 'type', 'debit', 'credit', 'due_date', 'source_type', 'source_id', 'note'];

    protected function casts(): array
    {
        return ['debit' => 'integer', 'credit' => 'integer', 'due_date' => 'date'];
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }
}
