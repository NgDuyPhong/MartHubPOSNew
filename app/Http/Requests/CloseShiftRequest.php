<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CloseShiftRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->is_active === true;
    }

    public function rules(): array
    {
        return ['actual_cash' => ['required', 'integer', 'min:0'], 'closing_note' => ['nullable', 'string', 'max:1000'], 'counts' => ['nullable', 'array'], 'counts.*.denomination' => ['required', 'integer', 'gt:0'], 'counts.*.quantity' => ['required', 'integer', 'min:0']];
    }
}
