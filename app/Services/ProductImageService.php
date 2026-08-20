<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;

class ProductImageService
{
    public function store(UploadedFile $file, int $organizationId): string
    {
        $this->ensureCapability();

        $source = @file_get_contents($file->getRealPath());
        $size = @getimagesizefromstring($source ?: '');
        if ($source === false || $size === false) {
            throw new RuntimeException('Không thể đọc ảnh sản phẩm.');
        }

        [$width, $height] = $size;
        if ($width > config('catalog.images.max_source_width') || $height > config('catalog.images.max_source_height')) {
            throw new RuntimeException('Kích thước ảnh nguồn vượt quá giới hạn cho phép.');
        }

        $image = @imagecreatefromstring($source);
        if ($image === false) {
            throw new RuntimeException('Không thể giải mã ảnh sản phẩm.');
        }

        $scale = min(config('catalog.images.max_width') / $width, config('catalog.images.max_height') / $height, 1);
        $targetWidth = max(1, (int) round($width * $scale));
        $targetHeight = max(1, (int) round($height * $scale));
        $canvas = imagecreatetruecolor($targetWidth, $targetHeight);
        imagealphablending($canvas, false);
        imagesavealpha($canvas, true);
        $transparent = imagecolorallocatealpha($canvas, 0, 0, 0, 127);
        imagefill($canvas, 0, 0, $transparent);
        imagecopyresampled($canvas, $image, 0, 0, 0, 0, $targetWidth, $targetHeight, $width, $height);

        ob_start();
        $encoded = imagewebp($canvas, null, config('catalog.images.webp_quality'));
        $contents = ob_get_clean();
        imagedestroy($image);
        imagedestroy($canvas);

        if (! $encoded || ! is_string($contents) || $contents === '') {
            throw new RuntimeException('Không thể mã hóa ảnh WebP.');
        }

        $path = sprintf(
            '%s/%d/%s/%s.webp',
            trim(config('catalog.images.directory'), '/'),
            $organizationId,
            now()->format('Y/m'),
            (string) Str::uuid(),
        );

        if (! Storage::disk(config('catalog.images.disk'))->put($path, $contents)) {
            throw new RuntimeException('Không thể lưu ảnh sản phẩm.');
        }

        return $path;
    }

    public function url(?string $path): ?string
    {
        return $path === null ? null : Storage::disk(config('catalog.images.disk'))->url($path);
    }

    public function delete(?string $path, ?int $productId = null): void
    {
        if ($path === null || ! $this->isManagedPath($path)) {
            return;
        }

        try {
            Storage::disk(config('catalog.images.disk'))->delete($path);
        } catch (\Throwable $exception) {
            Log::warning('Product image cleanup failed.', [
                'product_id' => $productId,
                'path' => $path,
                'exception' => $exception::class,
            ]);
        }
    }

    private function ensureCapability(): void
    {
        if (! function_exists('imagewebp') || ! function_exists('imagecreatefromstring')) {
            throw new RuntimeException('Môi trường chưa hỗ trợ GD/WebP để xử lý ảnh sản phẩm.');
        }
    }

    private function isManagedPath(string $path): bool
    {
        $prefix = trim(config('catalog.images.directory'), '/').'/';

        return Str::startsWith(ltrim($path, '/'), $prefix) && ! str_contains($path, '..');
    }
}
