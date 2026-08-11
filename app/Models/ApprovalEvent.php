<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ApprovalEvent extends Model
{
    protected $fillable = ['requested_by', 'approved_by', 'action', 'approvable_type', 'approvable_id', 'status', 'context'];

    protected function casts(): array
    {
        return ['context' => 'array'];
    }
}
