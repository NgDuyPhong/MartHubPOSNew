<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreUnitRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->canManageCatalog() === true;
    }

    public function rules(): array
    {
        $organizationId = $this->user()?->organization_id;
        $unit = $this->route('unit');

        return [
            'code' => ['required', 'string', 'max:30', 'regex:/^[A-Za-z0-9_-]+$/', Rule::unique('units')->where('organization_id', $organizationId)->ignore($unit?->id)],
            'name' => ['required', 'string', 'max:100'],
            'is_active' => ['boolean'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'code' => $this->string('code')->upper()->trim()->toString(),
            'is_active' => $this->boolean('is_active', true),
        ]);
    }
}
