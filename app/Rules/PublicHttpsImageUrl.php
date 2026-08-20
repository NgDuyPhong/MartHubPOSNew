<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

class PublicHttpsImageUrl implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_string($value) || mb_strlen($value) > 2048) {
            $fail('URL ảnh không được vượt quá 2048 ký tự.');

            return;
        }

        $parts = parse_url($value);
        $host = strtolower((string) ($parts['host'] ?? ''));

        if (($parts['scheme'] ?? null) !== 'https' || $host === '' || isset($parts['user'], $parts['pass'])) {
            $fail('URL ảnh phải là HTTPS trực tiếp và không chứa thông tin đăng nhập.');

            return;
        }

        if ($host === 'localhost' || str_ends_with($host, '.local') || filter_var($host, FILTER_VALIDATE_IP)) {
            $fail('URL ảnh không được trỏ tới máy cục bộ hoặc địa chỉ IP.');

            return;
        }

        $allowlist = config('catalog.images.external_hosts', []);
        if ($allowlist !== [] && ! in_array($host, $allowlist, true)) {
            $fail('Tên miền ảnh chưa được cho phép.');
        }
    }
}
