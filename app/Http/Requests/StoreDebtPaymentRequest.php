<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreDebtPaymentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->is_active === true;
    }

    public function rules(): array
    {
        return [
            'shift_id' => ['required', 'exists:shifts,id'],
            'method' => ['required', Rule::in(['cash', 'qr'])],
            'amount' => ['required', 'integer', 'gt:0'],
            'reference' => ['nullable', 'string', 'max:255'],
            'manually_confirmed' => ['nullable', 'boolean'],
            'note' => ['nullable', 'string', 'max:500'],
        ];
    }
}
