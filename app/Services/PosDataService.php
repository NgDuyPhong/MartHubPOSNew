<?php

namespace App\Services;

use App\Models\Category;
use App\Models\Customer;
use App\Models\InventoryLot;
use App\Models\Product;
use App\Models\Register;
use App\Models\Sale;
use App\Models\Shift;
use App\Models\User;
use Illuminate\Support\Collection;

class PosDataService
{
    public function __construct(private readonly ResourceVersionService $resourceVersions) {}

    /** @return array<string, mixed> */
    public function bootstrap(User $user): array
    {
        return [
            'catalog' => $this->catalog($user),
            'categories' => $this->categories($user),
            'customers' => $this->customers($user),
            'activeShift' => $this->activeShift($user),
            'registers' => Register::query()->where('branch_id', $user->branch_id)->where('is_active', true)->get(['id', 'name']),
            'expiryAlerts' => $this->expiryAlerts($user),
            'canManageCatalog' => $user->canManageCatalog(),
            'latestReceipt' => $this->latestReceipt($user),
            'versions' => $this->resourceVersions->versions($user),
            'snapshotScope' => ['organizationId' => $user->organization_id, 'branchId' => $user->branch_id],
        ];
    }

    /** @param list<string> $resources */
    public function snapshot(User $user, array $resources): array
    {
        $allowed = ['catalog', 'categories', 'customers', 'activeShift', 'expiryAlerts', 'latestReceipt'];
        $requested = array_values(array_intersect($allowed, array_unique($resources)));
        $versions = $this->resourceVersions->versions($user);
        $snapshot = [
            'key' => $user->organization_id.':'.$user->branch_id,
            'versions' => $versions,
            'snapshotScope' => ['organizationId' => $user->organization_id, 'branchId' => $user->branch_id],
            'schemaVersion' => 1,
            'serverVersion' => $versions['catalog'].':'.$versions['inventory'],
            'fetchedAt' => now()->toISOString(),
        ];

        if (in_array('catalog', $requested, true) || in_array('categories', $requested, true)) {
            $snapshot['catalog'] = $this->catalog($user);
            $snapshot['categories'] = $this->categories($user);
        }
        if (in_array('customers', $requested, true)) {
            $snapshot['customers'] = $this->customers($user);
        }
        if (in_array('activeShift', $requested, true)) {
            $snapshot['activeShift'] = $this->activeShift($user);
        }
        if (in_array('expiryAlerts', $requested, true)) {
            $snapshot['expiryAlerts'] = $this->expiryAlerts($user);
        }
        if (in_array('latestReceipt', $requested, true)) {
            $snapshot['latestReceipt'] = $this->latestReceipt($user);
        }

        return $snapshot;
    }

    private function catalog(User $user): Collection
    {
        return Product::query()
            ->where('organization_id', $user->organization_id)
            ->where('is_active', true)
            ->select(['id', 'category_id', 'sku', 'name', 'image_path', 'external_image_url', 'updated_at'])
            ->with(['variants' => fn ($query) => $query->select(['id', 'product_id', 'name', 'updated_at'])->where('is_active', true)->with([
                'units' => fn ($unitQuery) => $unitQuery->select(['id', 'product_variant_id', 'unit_id', 'conversion_to_base', 'sale_price', 'is_default_sale', 'allows_fractional_quantity', 'updated_at'])->where('is_active', true)->with([
                    'unit:id,code,name',
                    'barcodes:id,product_unit_id,value,updated_at',
                ]),
                'balances' => fn ($balanceQuery) => $balanceQuery->select(['id', 'product_variant_id', 'quantity_base'])->where('branch_id', $user->branch_id)->whereNull('inventory_lot_id'),
            ])])
            ->orderBy('name')
            ->get();
    }

    private function categories(User $user): Collection
    {
        return Category::query()->where('organization_id', $user->organization_id)->where('is_active', true)->orderBy('sort_order')->get(['id', 'name', 'color']);
    }

    private function customers(User $user): Collection
    {
        return Customer::query()->select(['id', 'code', 'name', 'phone', 'is_active'])->where('organization_id', $user->organization_id)->where('is_active', true)->withSum('creditEntries as debit_total', 'debit')->withSum('creditEntries as credit_total', 'credit')->orderBy('name')->get()->map(fn (Customer $customer) => [
            'id' => $customer->id,
            'code' => $customer->code,
            'name' => $customer->name,
            'phone' => $customer->phone,
            'is_active' => $customer->is_active,
            'balance' => (int) $customer->debit_total - (int) $customer->credit_total,
        ]);
    }

    /** @return array<string, mixed>|null */
    private function activeShift(User $user): ?array
    {
        $shift = Shift::query()->select(['id', 'register_id', 'opened_by', 'code', 'opening_cash', 'opened_at'])->where('status', 'open')->whereHas('register', fn ($query) => $query->where('branch_id', $user->branch_id))->with(['register:id,name', 'openedBy:id,name'])->first();

        return $shift ? [
            'id' => $shift->id,
            'code' => $shift->code,
            'opening_cash' => $shift->opening_cash,
            'opened_at' => $shift->opened_at?->toISOString(),
            'opened_by' => $shift->openedBy ? ['name' => $shift->openedBy->name] : null,
            'register' => ['name' => $shift->register->name],
        ] : null;
    }

    private function expiryAlerts(User $user): int
    {
        return InventoryLot::query()->where('branch_id', $user->branch_id)->whereNotNull('expiry_date')->whereDate('expiry_date', '<=', now()->addDays(7))->whereHas('balances', fn ($query) => $query->where('quantity_base', '>', 0))->count();
    }

    /** @return array<string, mixed>|null */
    private function latestReceipt(User $user): ?array
    {
        $latestSale = Sale::query()->where('branch_id', $user->branch_id)->with(['items', 'payments', 'customer', 'shift', 'user.branch'])->latest('sold_at')->first();

        return $latestSale ? $this->receiptData($latestSale) : null;
    }

    /** @return array<string, mixed> */
    public function receiptData(Sale $sale): array
    {
        return [
            'id' => $sale->id,
            'invoice_number' => $sale->invoice_number,
            'sold_at' => $sale->sold_at?->toISOString(),
            'source' => $sale->source,
            'status' => $sale->status,
            'branch_name' => $sale->user?->branch?->name,
            'shift_code' => $sale->shift?->code,
            'cashier_name' => $sale->user?->name,
            'customer_name' => $sale->customer?->name,
            'note' => $sale->note,
            'synced_at' => $sale->synced_at?->toISOString(),
            'subtotal' => $sale->subtotal,
            'discount_amount' => $sale->discount_amount,
            'total' => $sale->total,
            'paid_amount' => $sale->paid_amount,
            'debt_amount' => $sale->debt_amount,
            'change_amount' => $sale->change_amount,
            'payments' => $sale->payments->map(fn ($payment): array => ['method' => $payment->method, 'amount' => $payment->amount])->values()->all(),
            'items' => $sale->items->map(fn ($item): array => [
                'id' => $item->id,
                'product_name' => $item->product_name,
                'variant_name' => $item->variant_name,
                'product_sku' => $item->product_sku,
                'quantity' => (string) $item->quantity,
                'unit_name' => $item->unit_name,
                'unit_code' => $item->unit_code,
                'unit_price' => $item->unit_price,
                'original_unit_price' => $item->original_unit_price,
                'discount_amount' => $item->discount_amount,
                'line_total' => $item->line_total,
            ])->values()->all(),
        ];
    }
}
