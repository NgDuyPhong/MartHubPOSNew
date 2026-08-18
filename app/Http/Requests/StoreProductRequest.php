<?php

namespace App\Http\Requests;

use App\Models\Barcode;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->canManageCatalog() === true;
    }

    public function rules(): array
    {
        $organizationId = $this->user()?->organization_id;
        $productId = $this->route('product')?->id;

        return [
            'name' => ['required', 'string', 'max:255'],
            'sku' => ['required', 'string', 'max:100', Rule::unique('products')->where('organization_id', $organizationId)->ignore($productId)],
            'category_id' => ['nullable', Rule::exists('categories', 'id')->where('organization_id', $organizationId)],
            'track_lot' => ['boolean'],
            'track_expiry' => ['boolean'],
            'is_active' => ['boolean'],
            'image' => ['nullable', 'image', 'max:4096'],
            'units' => ['required', 'array', 'min:1'],
            'units.*.id' => ['nullable', 'integer', 'exists:product_units,id'],
            'units.*.unit_id' => ['required', Rule::exists('units', 'id')->where('organization_id', $organizationId)],
            'units.*.conversion_to_base' => ['required', 'numeric', 'min:0.000001'],
            'units.*.sale_price' => ['required', 'integer', 'min:0'],
            'units.*.barcode' => ['nullable', 'string', 'max:100', 'distinct'],
            'units.*.is_base' => ['required', 'boolean'],
            'units.*.is_default_sale' => ['required', 'boolean'],
            'units.*.allows_fractional_quantity' => ['sometimes', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'units.required' => 'Sản phẩm phải có ít nhất một đơn vị bán.',
            'units.*.barcode.unique' => 'Mã vạch đã được dùng cho sản phẩm khác.',
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge(['is_active' => $this->boolean('is_active', true)]);
    }

    public function after(): array
    {
        return [function ($validator) {
            $units = collect($this->input('units', []));
            if ($units->where('is_base', true)->count() !== 1) {
                $validator->errors()->add('units', 'Phải chọn đúng một đơn vị cơ sở.');
            }
            if ($units->where('is_default_sale', true)->count() !== 1) {
                $validator->errors()->add('units', 'Phải chọn đúng một đơn vị bán mặc định.');
            }
            $base = $units->firstWhere('is_base', true);
            if ($base && (float) $base['conversion_to_base'] !== 1.0) {
                $validator->errors()->add('units', 'Hệ số của đơn vị cơ sở phải bằng 1.');
            }
            foreach ($units as $index => $unit) {
                if (! ($unit['barcode'] ?? null)) {
                    continue;
                }
                $exists = Barcode::query()->where('value', $unit['barcode'])->when($unit['id'] ?? null, fn ($query, $productUnitId) => $query->where('product_unit_id', '!=', $productUnitId))->exists();
                if ($exists) {
                    $validator->errors()->add("units.{$index}.barcode", 'Mã vạch đã được dùng cho sản phẩm khác.');
                }
            }
        }];
    }
}
