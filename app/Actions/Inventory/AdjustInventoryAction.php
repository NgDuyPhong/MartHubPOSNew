<?php

namespace App\Actions\Inventory;

use App\Models\InventoryBalance;
use App\Models\InventoryMovement;
use App\Models\User;

class AdjustInventoryAction
{
    public function execute(int $branchId, int $variantId, float $quantityBase, string $type, User $actor, ?int $lotId = null, ?string $sourceType = null, ?int $sourceId = null, ?string $reason = null): InventoryBalance
    {
        $scopeKey = implode(':', [$branchId, $variantId, $lotId ?? 0]);
        InventoryBalance::query()->firstOrCreate(
            ['scope_key' => $scopeKey],
            ['branch_id' => $branchId, 'product_variant_id' => $variantId, 'inventory_lot_id' => $lotId, 'quantity_base' => 0],
        );

        $balance = InventoryBalance::query()->where('scope_key', $scopeKey)->lockForUpdate()->firstOrFail();
        $balance->quantity_base = (float) $balance->quantity_base + $quantityBase;
        $balance->save();

        InventoryMovement::query()->create([
            'branch_id' => $branchId,
            'product_variant_id' => $variantId,
            'inventory_lot_id' => $lotId,
            'user_id' => $actor->id,
            'type' => $type,
            'quantity_base' => $quantityBase,
            'balance_after' => $balance->quantity_base,
            'source_type' => $sourceType,
            'source_id' => $sourceId,
            'reason' => $reason,
            'metadata' => ['negative_stock' => (float) $balance->quantity_base < 0],
        ]);

        return $balance;
    }
}
