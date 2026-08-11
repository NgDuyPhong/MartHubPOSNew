<?php

namespace App\Http\Controllers;

use App\Models\CustomerCreditEntry;
use App\Models\InventoryBalance;
use App\Models\InventoryLot;
use App\Models\Payment;
use App\Models\Sale;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class RetailDashboardController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $branchId = $request->user()->branch_id;
        $todaySales = Sale::query()->where('branch_id', $branchId)->whereDate('sold_at', today());

        return Inertia::render('dashboard', [
            'summary' => [
                'revenue' => (int) (clone $todaySales)->sum('total'),
                'orders' => (int) (clone $todaySales)->count(),
                'cash' => (int) Payment::query()->whereHas('sale', fn ($query) => $query->where('branch_id', $branchId)->whereDate('sold_at', today()))->where('method', 'cash')->where('direction', 'in')->sum('amount'),
                'qr' => (int) Payment::query()->whereHas('sale', fn ($query) => $query->where('branch_id', $branchId)->whereDate('sold_at', today()))->where('method', 'qr')->where('direction', 'in')->sum('amount'),
                'debt' => (int) CustomerCreditEntry::query()->whereHas('customer', fn ($query) => $query->where('organization_id', $request->user()->organization_id))->sum('debit') - (int) CustomerCreditEntry::query()->whereHas('customer', fn ($query) => $query->where('organization_id', $request->user()->organization_id))->sum('credit'),
                'negativeStock' => InventoryBalance::query()->where('branch_id', $branchId)->whereNull('inventory_lot_id')->where('quantity_base', '<', 0)->count(),
                'expiring' => InventoryLot::query()->where('branch_id', $branchId)->whereNotNull('expiry_date')->whereDate('expiry_date', '<=', now()->addDays(7))->whereHas('balances', fn ($query) => $query->where('quantity_base', '>', 0))->count(),
            ],
            'recentSales' => Sale::query()->where('branch_id', $branchId)->with('customer:id,name')->latest('sold_at')->limit(10)->get(),
        ]);
    }
}
