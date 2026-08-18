<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Customer;
use App\Models\InventoryLot;
use App\Models\Product;
use App\Models\Register;
use App\Models\Sale;
use App\Models\Shift;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PosController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $user = $request->user();
        $products = Product::query()
            ->where('organization_id', $user->organization_id)
            ->where('is_active', true)
            ->select(['id', 'category_id', 'sku', 'name', 'image_path', 'updated_at'])
            ->with(['variants' => fn ($query) => $query->select(['id', 'product_id', 'name', 'updated_at'])->where('is_active', true)->with([
                'units' => fn ($unitQuery) => $unitQuery->select(['id', 'product_variant_id', 'unit_id', 'conversion_to_base', 'sale_price', 'is_default_sale', 'allows_fractional_quantity', 'updated_at'])->where('is_active', true)->with([
                    'unit:id,code,name',
                    'barcodes:id,product_unit_id,value,updated_at',
                ]),
                'balances' => fn ($balanceQuery) => $balanceQuery->select(['id', 'product_variant_id', 'quantity_base'])->where('branch_id', $user->branch_id)->whereNull('inventory_lot_id'),
            ])])
            ->orderBy('name')
            ->get();

        $activeShift = Shift::query()->select(['id', 'register_id', 'opened_by', 'code', 'opening_cash', 'opened_at'])->where('status', 'open')->whereHas('register', fn ($query) => $query->where('branch_id', $user->branch_id))->with(['register:id,name', 'openedBy:id,name'])->first();
        $latestSale = Sale::query()->where('branch_id', $user->branch_id)->with(['items', 'payments', 'customer', 'shift', 'user.branch'])->latest('sold_at')->first();

        return Inertia::render('pos/index', [
            'catalog' => $products,
            'categories' => Category::query()->where('organization_id', $user->organization_id)->where('is_active', true)->orderBy('sort_order')->get(['id', 'name', 'color']),
            'canManageCatalog' => $user->canManageCatalog(),
            'customers' => Customer::query()->select(['id', 'code', 'name', 'phone'])->where('organization_id', $user->organization_id)->where('is_active', true)->withSum('creditEntries as debit_total', 'debit')->withSum('creditEntries as credit_total', 'credit')->orderBy('name')->get()->map(fn (Customer $customer) => ['id' => $customer->id, 'code' => $customer->code, 'name' => $customer->name, 'phone' => $customer->phone, 'balance' => (int) $customer->debit_total - (int) $customer->credit_total]),
            'activeShift' => $activeShift ? [
                'id' => $activeShift->id,
                'code' => $activeShift->code,
                'opening_cash' => $activeShift->opening_cash,
                'opened_at' => $activeShift->opened_at?->toISOString(),
                'opened_by' => $activeShift->openedBy ? ['name' => $activeShift->openedBy->name] : null,
                'register' => ['name' => $activeShift->register->name],
            ] : null,
            'registers' => Register::query()->where('branch_id', $user->branch_id)->where('is_active', true)->get(['id', 'name']),
            'expiryAlerts' => InventoryLot::query()->where('branch_id', $user->branch_id)->whereNotNull('expiry_date')->whereDate('expiry_date', '<=', now()->addDays(7))->whereHas('balances', fn ($query) => $query->where('quantity_base', '>', 0))->count(),
            'latestReceipt' => $latestSale ? $this->receiptData($latestSale) : null,
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function receiptData(Sale $sale): array
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
