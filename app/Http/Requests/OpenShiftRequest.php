<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class OpenShiftRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->is_active === true;
    }

    public function rules(): array
    {
        return ['register_id' => ['required', 'exists:registers,id'], 'opening_cash' => ['required', 'integer', 'min:0']];
    }
}
