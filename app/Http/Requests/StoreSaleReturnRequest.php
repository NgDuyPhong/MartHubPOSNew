<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreSaleReturnRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->is_active === true;
    }

    public function rules(): array
    {
        return ['shift_id' => ['required', 'exists:shifts,id'], 'type' => ['required', Rule::in(['refund', 'exchange'])], 'refund_method' => ['nullable', Rule::in(['cash', 'qr', 'debt'])], 'reason' => ['required', 'string', 'max:500'], 'items' => ['required', 'array', 'min:1'], 'items.*.sale_item_id' => ['required', 'exists:sale_items,id'], 'items.*.quantity' => ['required', 'numeric', 'gt:0'], 'items.*.condition' => ['required', Rule::in(['resellable', 'damaged'])]];
    }
}
