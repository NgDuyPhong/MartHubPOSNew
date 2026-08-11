<?php

namespace App\Actions\Sales;

use App\Actions\Inventory\AdjustInventoryAction;
use App\Models\ApprovalEvent;
use App\Models\Customer;
use App\Models\CustomerCreditEntry;
use App\Models\IdempotencyRecord;
use App\Models\InventoryBalance;
use App\Models\Payment;
use App\Models\ProductUnit;
use App\Models\Sale;
use App\Models\Shift;
use App\Models\User;
use App\Services\OwnerApprovalService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class CreateSaleAction
{
    public function __construct(
        private readonly AdjustInventoryAction $adjustInventory,
        private readonly OwnerApprovalService $ownerApproval,
    ) {}

    public function execute(User $user, array $data): Sale
    {
        $requestHash = hash('sha256', json_encode($data, JSON_THROW_ON_ERROR));
        $existing = IdempotencyRecord::query()->where('organization_id', $user->organization_id)->where('key', $data['idempotency_key'])->first();
        if ($existing) {
            if ($existing->request_hash !== $requestHash) {
                throw ValidationException::withMessages(['idempotency_key' => 'Mã đồng bộ đã được dùng cho một nội dung khác.']);
            }

            return Sale::query()->with(['items', 'payments', 'customer'])->findOrFail($existing->response_body['sale_id']);
        }

        return DB::transaction(function () use ($user, $data, $requestHash) {
            $shift = Shift::query()
                ->whereKey($data['shift_id'])
                ->where('status', 'open')
                ->whereHas('register', fn ($query) => $query->where('branch_id', $user->branch_id))
                ->lockForUpdate()
                ->first();
            if (! $shift) {
                throw ValidationException::withMessages(['shift_id' => 'Cần mở ca tại đúng chi nhánh trước khi bán hàng.']);
            }

            $customer = isset($data['customer_id'])
                ? Customer::query()->whereKey($data['customer_id'])->where('organization_id', $user->organization_id)->firstOrFail()
                : null;
            $preparedItems = [];
            $subtotal = 0;
            $discountTotal = 0;
            $needsApproval = false;

            foreach ($data['items'] as $item) {
                $productUnit = ProductUnit::query()
                    ->with(['unit', 'variant.product'])
                    ->whereKey($item['product_unit_id'])
                    ->where('is_active', true)
                    ->firstOrFail();
                if ($productUnit->variant->product->organization_id !== $user->organization_id) {
                    abort(403);
                }

                $quantity = (float) $item['quantity'];
                $originalPrice = (int) $productUnit->sale_price;
                $unitPrice = array_key_exists('unit_price', $item) && $item['unit_price'] !== null ? (int) $item['unit_price'] : $originalPrice;
                $discount = (int) ($item['discount_amount'] ?? 0);
                $gross = (int) round($unitPrice * $quantity);
                if ($discount > $gross) {
                    throw ValidationException::withMessages(['items' => 'Giảm giá không được lớn hơn thành tiền của dòng hàng.']);
                }

                $needsApproval = $needsApproval || $unitPrice !== $originalPrice || $discount > 0;
                $subtotal += $gross;
                $discountTotal += $discount;
                $preparedItems[] = compact('productUnit', 'quantity', 'originalPrice', 'unitPrice', 'discount', 'gross');
            }

            $approver = $needsApproval ? $this->ownerApproval->verify($user, $data['owner_pin'] ?? null, $data['source']) : null;
            $total = $subtotal - $discountTotal;
            $tendered = collect($data['payments'] ?? [])->sum(fn ($payment) => (int) $payment['amount']);
            $qrTendered = collect($data['payments'] ?? [])->where('method', 'qr')->sum(fn ($payment) => (int) $payment['amount']);
            if ($qrTendered > $total) {
                throw ValidationException::withMessages(['payments' => 'Tiền QR không được lớn hơn tổng hóa đơn; chỉ tiền mặt mới có tiền thừa trả lại.']);
            }
            $paidAmount = min($total, $tendered);
            $debtAmount = max(0, $total - $paidAmount);
            $changeAmount = max(0, $tendered - $total);
            if ($debtAmount > 0 && ! $customer) {
                throw ValidationException::withMessages(['customer_id' => 'Cần chọn hoặc tạo khách hàng khi hóa đơn còn công nợ.']);
            }

            $sale = Sale::query()->create([
                'public_id' => (string) Str::uuid(),
                'branch_id' => $user->branch_id,
                'shift_id' => $shift->id,
                'user_id' => $user->id,
                'customer_id' => $customer?->id,
                'invoice_number' => 'HD-'.now()->format('Ymd-His').'-'.strtoupper(Str::random(4)),
                'status' => 'completed',
                'source' => $data['source'],
                'subtotal' => $subtotal,
                'discount_amount' => $discountTotal,
                'total' => $total,
                'paid_amount' => $paidAmount,
                'debt_amount' => $debtAmount,
                'change_amount' => $changeAmount,
                'note' => $data['note'] ?? null,
                'sold_at' => now(),
            ]);

            foreach ($preparedItems as $prepared) {
                $unit = $prepared['productUnit'];
                $variant = $unit->variant;
                $product = $variant->product;
                $quantityBase = $prepared['quantity'] * (float) $unit->conversion_to_base;
                $lineTotal = $prepared['gross'] - $prepared['discount'];
                $sale->items()->create([
                    'product_variant_id' => $variant->id,
                    'product_unit_id' => $unit->id,
                    'product_sku' => $product->sku,
                    'product_name' => $product->name,
                    'variant_name' => $variant->name,
                    'unit_code' => $unit->unit->code,
                    'unit_name' => $unit->unit->name,
                    'conversion_to_base' => $unit->conversion_to_base,
                    'quantity' => $prepared['quantity'],
                    'quantity_base' => $quantityBase,
                    'unit_price' => $prepared['unitPrice'],
                    'original_unit_price' => $prepared['originalPrice'],
                    'discount_amount' => $prepared['discount'],
                    'line_total' => $lineTotal,
                    'cost_base_snapshot' => $variant->last_cost_base,
                    'cost_total_snapshot' => (int) round($variant->last_cost_base * $quantityBase),
                    'price_overridden' => $prepared['unitPrice'] !== $prepared['originalPrice'],
                ]);
                $this->adjustInventory->execute($user->branch_id, $variant->id, -$quantityBase, 'sale', $user, sourceType: Sale::class, sourceId: $sale->id);
                $this->consumeLots($user, $variant->id, $quantityBase, $sale->id);
            }

            $remaining = $total;
            $orderedPayments = collect($data['payments'] ?? [])->sortBy(fn ($payment) => $payment['method'] === 'qr' ? 0 : 1);
            foreach ($orderedPayments as $paymentData) {
                if ($remaining <= 0) {
                    break;
                }
                if ($paymentData['method'] === 'qr' && ! ($paymentData['manually_confirmed'] ?? false)) {
                    throw ValidationException::withMessages(['payments' => 'Thu ngân phải xác nhận đã thấy giao dịch QR thành công.']);
                }
                $applied = min($remaining, (int) $paymentData['amount']);
                Payment::query()->create([
                    'sale_id' => $sale->id,
                    'customer_id' => $customer?->id,
                    'shift_id' => $shift->id,
                    'user_id' => $user->id,
                    'method' => $paymentData['method'],
                    'direction' => 'in',
                    'amount' => $applied,
                    'status' => 'confirmed',
                    'reference' => $paymentData['reference'] ?? null,
                    'manually_confirmed' => (bool) ($paymentData['manually_confirmed'] ?? false),
                    'paid_at' => now(),
                ]);
                $remaining -= $applied;
            }

            if ($debtAmount > 0) {
                CustomerCreditEntry::query()->create([
                    'customer_id' => $customer->id,
                    'user_id' => $user->id,
                    'type' => 'sale_debt',
                    'debit' => $debtAmount,
                    'credit' => 0,
                    'due_date' => $data['due_date'] ?? null,
                    'source_type' => Sale::class,
                    'source_id' => $sale->id,
                    'note' => 'Công nợ từ '.$sale->invoice_number,
                ]);
            }

            if ($approver) {
                ApprovalEvent::query()->create(['requested_by' => $user->id, 'approved_by' => $approver->id, 'action' => 'sale_price_or_discount_override', 'approvable_type' => Sale::class, 'approvable_id' => $sale->id, 'status' => 'approved', 'context' => ['source' => $data['source'], 'discount_amount' => $discountTotal]]);
            }

            IdempotencyRecord::query()->create(['organization_id' => $user->organization_id, 'key' => $data['idempotency_key'], 'operation' => 'create_sale', 'request_hash' => $requestHash, 'response_status' => 201, 'response_body' => ['sale_id' => $sale->id], 'expires_at' => now()->addDays(30)]);

            return $sale->load(['items', 'payments', 'customer']);
        }, 3);
    }

    private function consumeLots(User $user, int $variantId, float $quantityBase, int $saleId): void
    {
        $remaining = $quantityBase;
        $lotBalances = InventoryBalance::query()
            ->where('inventory_balances.branch_id', $user->branch_id)
            ->where('inventory_balances.product_variant_id', $variantId)
            ->whereNotNull('inventory_balances.inventory_lot_id')
            ->where('inventory_balances.quantity_base', '>', 0)
            ->join('inventory_lots', 'inventory_lots.id', '=', 'inventory_balances.inventory_lot_id')
            ->orderByRaw('inventory_lots.expiry_date IS NULL')
            ->orderBy('inventory_lots.expiry_date')
            ->orderBy('inventory_lots.received_date')
            ->select('inventory_balances.*')
            ->lockForUpdate()
            ->get();

        foreach ($lotBalances as $balance) {
            if ($remaining <= 0) {
                break;
            }
            $consumed = min($remaining, (float) $balance->quantity_base);
            $this->adjustInventory->execute($user->branch_id, $variantId, -$consumed, 'lot_sale', $user, $balance->inventory_lot_id, Sale::class, $saleId);
            $remaining -= $consumed;
        }
    }
}
