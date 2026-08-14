<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class QuickUpdateProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->canManageCatalog() === true;
    }

    public function rules(): array
    {
        $organizationId = $this->user()?->organization_id;

        return [
            'name' => ['required', 'string', 'max:255'],
            'category_id' => ['nullable', Rule::exists('categories', 'id')->where('organization_id', $organizationId)],
            'product_unit_id' => ['required', 'integer', Rule::exists('product_units', 'id')],
            'sale_price' => ['required', 'integer', 'min:0'],
            'updated_at' => ['required', 'date'],
        ];
    }
}
