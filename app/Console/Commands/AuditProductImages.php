<?php

namespace App\Console\Commands;

use App\Models\Product;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

class AuditProductImages extends Command
{
    protected $signature = 'catalog:images-audit {--delete : Delete unreferenced files older than the grace period}';

    protected $description = 'Audit managed product images without deleting files by default';

    public function handle(): int
    {
        $disk = Storage::disk(config('catalog.images.disk'));
        $prefix = trim(config('catalog.images.directory'), '/');
        $referenced = Product::query()->whereNotNull('image_path')->pluck('image_path')->map(fn (string $path): string => ltrim($path, '/'))->flip();
        $cutoff = now()->subDays((int) config('catalog.images.orphan_grace_days'));
        $candidates = [];
        $bytes = 0;

        foreach ($disk->allFiles($prefix) as $path) {
            if (isset($referenced[$path]) || $disk->lastModified($path) >= $cutoff->timestamp) {
                continue;
            }

            $candidates[] = $path;
            $bytes += $disk->size($path);
        }

        $this->info(sprintf('Found %d unreferenced image(s), %d bytes.', count($candidates), $bytes));
        if (! $this->option('delete')) {
            foreach ($candidates as $path) {
                $this->line($path);
            }

            $this->comment('Dry-run only. Pass --delete to remove the listed files.');

            return self::SUCCESS;
        }

        foreach ($candidates as $path) {
            $disk->delete($path);
        }

        $this->info(sprintf('Deleted %d image(s).', count($candidates)));

        return self::SUCCESS;
    }
}
