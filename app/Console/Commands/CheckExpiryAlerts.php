<?php

namespace App\Console\Commands;

use App\Models\Branch;
use App\Models\InventoryLot;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class CheckExpiryAlerts extends Command
{
    protected $signature = 'inventory:check-expiry {--days=7 : Số ngày cảnh báo trước}';

    protected $description = 'Tổng hợp các lô còn tồn sắp hết hạn hoặc đã hết hạn';

    public function handle(): int
    {
        $days = max(0, (int) $this->option('days'));
        Branch::query()->where('is_active', true)->each(function (Branch $branch) use ($days) {
            $count = InventoryLot::query()
                ->where('branch_id', $branch->id)
                ->whereNotNull('expiry_date')
                ->whereDate('expiry_date', '<=', now()->addDays($days))
                ->whereHas('balances', fn ($query) => $query->where('quantity_base', '>', 0))
                ->count();
            Log::info('Expiry inventory check completed.', ['branch_id' => $branch->id, 'warning_days' => $days, 'lots' => $count]);
            $this->line("{$branch->name}: {$count} lô cần chú ý.");
        });

        return self::SUCCESS;
    }
}
