<?php

namespace App\Support;

class VietnameseSearch
{
    public static function normalize(?string $value): string
    {
        return trim((string) str($value ?? '')->lower()->ascii());
    }

    public static function combine(?string ...$values): string
    {
        return self::normalize(implode(' ', array_filter($values, static fn (?string $value): bool => $value !== null && $value !== '')));
    }
}
