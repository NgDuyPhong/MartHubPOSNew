<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PaymentAllocation extends Model
{
    protected $fillable = ['payment_id', 'customer_credit_entry_id', 'amount'];

    protected function casts(): array
    {
        return ['amount' => 'integer'];
    }
}
