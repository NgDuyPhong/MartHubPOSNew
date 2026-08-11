<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class IdempotencyRecord extends Model
{
    protected $fillable = ['organization_id', 'key', 'operation', 'request_hash', 'response_status', 'response_body', 'expires_at'];

    protected function casts(): array
    {
        return ['response_body' => 'array', 'expires_at' => 'datetime'];
    }
}
