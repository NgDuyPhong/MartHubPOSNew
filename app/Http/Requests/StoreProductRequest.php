<?php

namespace App\Http\Requests;

use App\Models\Barcode;
use App\Rules\PublicHttpsImageUrl;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\File;

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
            'image_action' => ['required', Rule::in(['keep', 'remove', 'upload', 'external', 'none'])],
            'image' => ['nullable', File::image()->types(['jpg', 'jpeg', 'png', 'webp'])->max(4096)->dimensions(Rule::dimensions()->maxWidth(6000)->maxHeight(6000))],
            'external_image_url' => ['nullable', 'string', 'max:2048', new PublicHttpsImageUrl],
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
            'image_action.required' => 'Vui lòng chọn cách cập nhật ảnh sản phẩm.',
            'image.mimes' => 'Ảnh chỉ hỗ trợ JPEG, PNG hoặc WebP.',
            'image.max' => 'Ảnh không được vượt quá 4 MB.',
            'external_image_url.url' => 'URL ảnh không hợp lệ.',
            'units.required' => 'Sản phẩm phải có ít nhất một đơn vị bán.',
            'units.*.barcode.unique' => 'Mã vạch đã được dùng cho sản phẩm khác.',
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'is_active' => $this->boolean('is_active', true),
            'image_action' => $this->input('image_action') ?: ($this->hasFile('image') ? 'upload' : ($this->route('product') ? 'keep' : 'none')),
        ]);
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
            if (in_array($this->input('image_action'), ['upload', 'external'], true) && $this->input('image_action') === 'upload' && ! $this->hasFile('image')) {
                $validator->errors()->add('image', 'Chọn một ảnh mới để tải lên.');
            }
            if ($this->input('image_action') === 'external' && ! $this->filled('external_image_url')) {
                $validator->errors()->add('external_image_url', 'Nhập URL ảnh trực tiếp.');
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
