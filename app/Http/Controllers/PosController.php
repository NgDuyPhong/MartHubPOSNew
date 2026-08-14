<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Customer;
use App\Models\InventoryLot;
use App\Models\Product;
use App\Models\Register;
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
            ->with(['variants' => fn ($query) => $query->select(['id', 'product_id', 'name'])->where('is_active', true)->with([
                'units' => fn ($unitQuery) => $unitQuery->select(['id', 'product_variant_id', 'unit_id', 'conversion_to_base', 'sale_price', 'is_default_sale'])->where('is_active', true)->with([
                    'unit:id,code,name',
                    'barcodes:id,product_unit_id,value',
                ]),
                'balances' => fn ($balanceQuery) => $balanceQuery->select(['id', 'product_variant_id', 'quantity_base'])->where('branch_id', $user->branch_id)->whereNull('inventory_lot_id'),
            ])])
            ->orderBy('name')
            ->get();

        $activeShift = Shift::query()->select(['id', 'register_id', 'code', 'opening_cash'])->where('status', 'open')->whereHas('register', fn ($query) => $query->where('branch_id', $user->branch_id))->with('register:id,name')->first();

        return Inertia::render('pos/index', [
            'catalog' => $products,
            'categories' => Category::query()->where('organization_id', $user->organization_id)->where('is_active', true)->orderBy('sort_order')->get(['id', 'name', 'color']),
            'canManageCatalog' => $user->canManageCatalog(),
            'customers' => Customer::query()->select(['id', 'code', 'name', 'phone'])->where('organization_id', $user->organization_id)->where('is_active', true)->withSum('creditEntries as debit_total', 'debit')->withSum('creditEntries as credit_total', 'credit')->orderBy('name')->get()->map(fn (Customer $customer) => ['id' => $customer->id, 'code' => $customer->code, 'name' => $customer->name, 'phone' => $customer->phone, 'balance' => (int) $customer->debit_total - (int) $customer->credit_total]),
            'activeShift' => $activeShift,
            'registers' => Register::query()->where('branch_id', $user->branch_id)->where('is_active', true)->get(['id', 'name']),
            'expiryAlerts' => InventoryLot::query()->where('branch_id', $user->branch_id)->whereNotNull('expiry_date')->whereDate('expiry_date', '<=', now()->addDays(7))->whereHas('balances', fn ($query) => $query->where('quantity_base', '>', 0))->count(),
        ]);
    }
}
