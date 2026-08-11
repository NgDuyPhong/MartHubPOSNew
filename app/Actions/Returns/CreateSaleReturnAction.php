<?php

namespace App\Actions\Returns;

use App\Actions\Inventory\AdjustInventoryAction;
use App\Models\CustomerCreditEntry;
use App\Models\Payment;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\SaleReturn;
use App\Models\SaleReturnItem;
use App\Models\Shift;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class CreateSaleReturnAction
{
    public function __construct(private readonly AdjustInventoryAction $adjustInventory) {}

    public function execute(User $user, Sale $sale, array $data): SaleReturn
    {
        return DB::transaction(function () use ($user, $sale, $data) {
            $shift = Shift::query()->whereKey($data['shift_id'])->where('status', 'open')->whereHas('register', fn ($query) => $query->where('branch_id', $user->branch_id))->lockForUpdate()->first();
            if (! $shift || $sale->branch_id !== $user->branch_id) {
                throw ValidationException::withMessages(['shift_id' => 'Cần ca đang mở tại đúng chi nhánh để đổi trả.']);
            }

            $prepared = [];
            $total = 0;
            foreach ($data['items'] as $itemData) {
                $item = SaleItem::query()->whereKey($itemData['sale_item_id'])->where('sale_id', $sale->id)->lockForUpdate()->firstOrFail();
                $returned = (float) SaleReturnItem::query()->where('sale_item_id', $item->id)->sum('quantity');
                $quantity = (float) $itemData['quantity'];
                if ($quantity + $returned > (float) $item->quantity) {
                    throw ValidationException::withMessages(['items' => "Số lượng trả của {$item->product_name} vượt quá số đã bán."]);
                }
                $refund = (int) round(((int) $item->line_total / (float) $item->quantity) * $quantity);
                $total += $refund;
                $prepared[] = ['item' => $item, 'quantity' => $quantity, 'quantity_base' => $quantity * (float) $item->conversion_to_base, 'refund' => $refund, 'condition' => $itemData['condition']];
            }

            $return = SaleReturn::query()->create([
                'public_id' => (string) Str::uuid(),
                'sale_id' => $sale->id,
                'shift_id' => $shift->id,
                'user_id' => $user->id,
                'return_number' => 'TH-'.now()->format('Ymd-His').'-'.strtoupper(Str::random(3)),
                'type' => $data['type'],
                'total' => $total,
                'refund_method' => $data['refund_method'] ?? null,
                'reason' => $data['reason'],
                'returned_at' => now(),
            ]);

            foreach ($prepared as $row) {
                $return->items()->create(['sale_item_id' => $row['item']->id, 'quantity' => $row['quantity'], 'quantity_base' => $row['quantity_base'], 'refund_amount' => $row['refund'], 'condition' => $row['condition']]);
                if ($row['condition'] === 'resellable' && $row['item']->product_variant_id) {
                    $this->adjustInventory->execute($user->branch_id, $row['item']->product_variant_id, $row['quantity_base'], 'sale_return', $user, sourceType: SaleReturn::class, sourceId: $return->id, reason: $data['reason']);
                }
            }

            $method = $data['refund_method'] ?? null;
            if ($method === 'debt' && $sale->customer_id) {
                $customerBalance = (int) CustomerCreditEntry::query()->where('customer_id', $sale->customer_id)->sum('debit') - (int) CustomerCreditEntry::query()->where('customer_id', $sale->customer_id)->sum('credit');
                $creditAmount = min($total, max(0, $customerBalance));
                if ($creditAmount > 0) {
                    CustomerCreditEntry::query()->create(['customer_id' => $sale->customer_id, 'user_id' => $user->id, 'type' => 'return_credit', 'debit' => 0, 'credit' => $creditAmount, 'source_type' => SaleReturn::class, 'source_id' => $return->id, 'note' => 'Cấn trừ công nợ từ '.$return->return_number]);
                }
                if ($total > $creditAmount) {
                    Payment::query()->create(['sale_id' => $sale->id, 'customer_id' => $sale->customer_id, 'shift_id' => $shift->id, 'user_id' => $user->id, 'method' => 'cash', 'direction' => 'out', 'amount' => $total - $creditAmount, 'status' => 'confirmed', 'manually_confirmed' => false, 'paid_at' => now()]);
                }
            } elseif (in_array($method, ['cash', 'qr'], true)) {
                Payment::query()->create(['sale_id' => $sale->id, 'customer_id' => $sale->customer_id, 'shift_id' => $shift->id, 'user_id' => $user->id, 'method' => $method, 'direction' => 'out', 'amount' => $total, 'status' => 'confirmed', 'manually_confirmed' => $method === 'qr', 'paid_at' => now()]);
            }

            return $return->load('items');
        }, 3);
    }
}
