<?php

namespace App\Http\Requests;

use App\Models\Category;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreCategoryRequest extends FormRequest
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
        $category = $this->route('category');

        return [
            'name' => ['required', 'string', 'max:255'],
            'code' => ['nullable', 'string', 'max:100', 'regex:/^[a-z0-9-]+$/', Rule::unique('categories')->where('organization_id', $organizationId)->ignore($category?->id)],
            'description' => ['nullable', 'string', 'max:1000'],
            'color' => ['nullable', 'string', 'max:30'],
            'sort_order' => ['nullable', 'integer', 'min:0', 'max:100000'],
            'parent_id' => ['nullable', 'integer', Rule::exists('categories', 'id')->where('organization_id', $organizationId)],
            'is_active' => ['boolean'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'code' => $this->filled('code') ? $this->string('code')->lower()->trim()->toString() : null,
            'is_active' => $this->boolean('is_active', true),
        ]);
    }

    public function after(): array
    {
        return [function ($validator): void {
            $parentId = $this->integer('parent_id') ?: null;
            $category = $this->route('category');

            if (! $parentId || ! $category instanceof Category) {
                return;
            }

            $visited = [];
            $cursor = Category::query()->whereKey($parentId)->first();
            while ($cursor) {
                if (in_array($cursor->id, $visited, true) || $cursor->id === $category->id) {
                    $validator->errors()->add('parent_id', 'Không thể chọn chính danh mục hoặc danh mục con làm danh mục cha.');
                    break;
                }
                $visited[] = $cursor->id;
                $cursor = $cursor->parent_id ? Category::query()->whereKey($cursor->parent_id)->first() : null;
            }
        }];
    }
}
