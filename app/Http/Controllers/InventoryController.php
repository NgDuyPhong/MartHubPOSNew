<?php

namespace App\Http\Controllers;

use App\Models\InventoryBalance;
use App\Models\InventoryLot;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class InventoryController extends Controller
{
    public function index(Request $request): Response
    {
        return Inertia::render('inventory/index', [
            'balances' => InventoryBalance::query()->where('branch_id', $request->user()->branch_id)->whereNull('inventory_lot_id')->with('variant.product:id,name,sku')->orderBy('quantity_base')->paginate(50),
            'expiringLots' => InventoryLot::query()->where('branch_id', $request->user()->branch_id)->whereNotNull('expiry_date')->whereDate('expiry_date', '<=', now()->addDays(7))->whereHas('balances', fn ($query) => $query->where('quantity_base', '>', 0))->with('productVariant.product')->orderBy('expiry_date')->get(),
        ]);
    }
}
