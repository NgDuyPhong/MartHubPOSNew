<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreShiftCashMovementRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->is_active === true;
    }

    public function rules(): array
    {
        return ['type' => ['required', Rule::in(['in', 'out'])], 'amount' => ['required', 'integer', 'gt:0'], 'reason' => ['required', 'string', 'max:255']];
    }
}
