<?php

namespace App\Http\Controllers;

use App\Models\InventoryBalance;
use App\Models\InventoryLot;
use App\Support\VietnameseSearch;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class InventoryController extends Controller
{
    public function index(Request $request): Response
    {
        $search = trim((string) $request->string('search'));
        $normalizedSearch = VietnameseSearch::normalize($search);
        $stock = $request->string('stock')->toString() ?: 'all';
        $perPage = in_array($request->integer('per_page'), config('ux.pagination.options'), true) ? $request->integer('per_page') : config('ux.pagination.default');
        $expiryPage = max(1, $request->integer('expiry_page'));

        return Inertia::render('inventory/index', [
            'balances' => InventoryBalance::query()->where('branch_id', $request->user()->branch_id)->whereNull('inventory_lot_id')->with('variant.product:id,name,sku')
                ->when($normalizedSearch !== '', fn ($query) => $query->whereHas('variant.product', fn ($productQuery) => $productQuery->where('search_text', 'like', "%{$normalizedSearch}%")))
                ->when($stock === 'negative', fn ($query) => $query->where('quantity_base', '<', 0))
                ->when($stock === 'empty', fn ($query) => $query->where('quantity_base', '=', 0))
                ->when($stock === 'positive', fn ($query) => $query->where('quantity_base', '>', 0))
                ->orderBy('quantity_base')->paginate($perPage)->withQueryString(),
            'expiringLots' => InventoryLot::query()->where('branch_id', $request->user()->branch_id)->whereNotNull('expiry_date')->whereDate('expiry_date', '<=', now()->addDays(7))->whereHas('balances', fn ($query) => $query->where('quantity_base', '>', 0))->when($normalizedSearch !== '', fn ($query) => $query->whereHas('productVariant.product', fn ($productQuery) => $productQuery->where('search_text', 'like', "%{$normalizedSearch}%")))->with('productVariant.product')->orderBy('expiry_date')->paginate($perPage, ['*'], 'expiry_page', $expiryPage)->withQueryString(),
            'filters' => ['search' => $search, 'stock' => $stock, 'per_page' => $perPage, 'expiry_page' => $expiryPage],
        ]);
    }
}
