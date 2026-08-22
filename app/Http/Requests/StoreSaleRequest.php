<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreSaleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasCapability('pos.sell') === true;
    }

    public function rules(): array
    {
        return [
            'idempotency_key' => ['required', 'uuid'],
            'shift_id' => ['required', 'exists:shifts,id'],
            'original_actor_id' => ['nullable', 'integer', 'exists:users,id'],
            'customer_id' => ['nullable', 'exists:customers,id'],
            'source' => ['required', Rule::in(['online', 'offline_sync'])],
            'occurred_at' => ['nullable', 'date'],
            'queued_at' => ['nullable', 'date'],
            'note' => ['nullable', 'string', 'max:1000'],
            'owner_pin' => ['nullable', 'digits_between:4,12'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_unit_id' => ['required', 'exists:product_units,id'],
            'items.*.quantity' => ['required', 'numeric', 'gt:0'],
            'items.*.unit_price' => ['nullable', 'integer', 'min:0'],
            'items.*.discount_amount' => ['nullable', 'integer', 'min:0'],
            'payments' => ['nullable', 'array'],
            'payments.*.method' => ['required', Rule::in(['cash', 'qr'])],
            'payments.*.amount' => ['required', 'integer', 'gt:0'],
            'payments.*.reference' => ['nullable', 'string', 'max:255'],
            'payments.*.manually_confirmed' => ['nullable', 'boolean'],
            'due_date' => ['nullable', 'date'],
        ];
    }
}
