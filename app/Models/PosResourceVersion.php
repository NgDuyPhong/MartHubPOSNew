<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PosResourceVersion extends Model
{
    protected $fillable = ['resource', 'organization_id', 'branch_id', 'scope_key', 'version'];

    protected function casts(): array
    {
        return [
            'organization_id' => 'integer',
            'branch_id' => 'integer',
            'version' => 'integer',
        ];
    }
}
