<?php

namespace App\Actions\Stock;

use App\Actions\Inventory\AdjustInventoryAction;
use App\Models\InventoryLot;
use App\Models\ProductUnit;
use App\Models\StockReceipt;
use App\Models\User;
use App\Services\ResourceVersionService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CreateStockReceiptAction
{
    public function __construct(
        private readonly AdjustInventoryAction $adjustInventory,
        private readonly ResourceVersionService $resourceVersions,
    ) {}

    public function execute(User $user, array $data): StockReceipt
    {
        return DB::transaction(function () use ($user, $data) {
            $receipt = StockReceipt::query()->create([
                'branch_id' => $user->branch_id,
                'user_id' => $user->id,
                'receipt_number' => 'NK-'.now()->format('Ymd-His').'-'.strtoupper(Str::random(3)),
                'source' => $data['source'],
                'status' => 'completed',
                'supplier_name' => $data['supplier_name'] ?? null,
                'note' => $data['note'] ?? null,
                'received_at' => $data['received_at'] ?? now(),
            ]);

            foreach ($data['items'] as $item) {
                $productUnit = ProductUnit::query()->with('variant.product')->whereKey($item['product_unit_id'])->firstOrFail();
                abort_unless($productUnit->variant->product->organization_id === $user->organization_id, 403);

                $quantity = (float) $item['quantity'];
                $conversion = (float) $productUnit->conversion_to_base;
                $quantityBase = $quantity * $conversion;
                $unitCost = (int) $item['unit_cost'];
                $costBase = (int) round($unitCost / $conversion);
                $lot = null;
                if (($item['lot_number'] ?? null) || ($item['expiry_date'] ?? null)) {
                    $lot = InventoryLot::query()->create([
                        'branch_id' => $user->branch_id,
                        'product_variant_id' => $productUnit->product_variant_id,
                        'lot_number' => $item['lot_number'] ?? null,
                        'expiry_date' => $item['expiry_date'] ?? null,
                        'received_date' => $data['received_at'] ?? now()->toDateString(),
                        'is_active' => true,
                    ]);
                }

                $receipt->items()->create([
                    'product_variant_id' => $productUnit->product_variant_id,
                    'product_unit_id' => $productUnit->id,
                    'inventory_lot_id' => $lot?->id,
                    'quantity' => $quantity,
                    'conversion_to_base' => $conversion,
                    'quantity_base' => $quantityBase,
                    'unit_cost' => $unitCost,
                    'cost_base' => $costBase,
                    'line_total' => (int) round($unitCost * $quantity),
                    'lot_number' => $item['lot_number'] ?? null,
                    'expiry_date' => $item['expiry_date'] ?? null,
                ]);

                $productUnit->variant()->update(['last_cost_base' => $costBase]);
                $this->adjustInventory->execute($user->branch_id, $productUnit->product_variant_id, $quantityBase, 'stock_in', $user, sourceType: StockReceipt::class, sourceId: $receipt->id);
                if ($lot) {
                    $this->adjustInventory->execute($user->branch_id, $productUnit->product_variant_id, $quantityBase, 'lot_stock_in', $user, $lot->id, StockReceipt::class, $receipt->id);
                }
            }
            $this->resourceVersions->bumpAfterCommit($user, ['catalog', 'inventory']);

            return $receipt->load('items');
        }, 3);
    }
}
