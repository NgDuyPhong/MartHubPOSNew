<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class LegacyImportRequest extends FormRequest
{
    public function authorize(): bool
    {
        return config('legacy-product-import.enabled', true)
            && $this->user()?->hasCapability('import.legacy') === true;
    }

    public function rules(): array
    {
        return [
            'bundle' => ['required', 'file', 'max:524288', 'extensions:zip', 'mimetypes:application/zip,application/x-zip-compressed,application/octet-stream'],
        ];
    }

    public function messages(): array
    {
        return [
            'bundle.required' => 'Hãy chọn gói dữ liệu legacy.',
            'bundle.file' => 'Tệp upload không hợp lệ.',
            'bundle.max' => 'Gói dữ liệu không được vượt quá 512 MB.',
            'bundle.mimetypes' => 'Chỉ chấp nhận file ZIP export từ MartHub POS.',
        ];
    }
}
