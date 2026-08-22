<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ReconcileShiftRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasCapability('shift.reconcile') === true;
    }

    public function rules(): array
    {
        return ['reconciliation_note' => ['nullable', 'string', 'max:2000']];
    }
}
