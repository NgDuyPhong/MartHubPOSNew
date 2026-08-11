<?php

namespace App\Http\Controllers;

use App\Actions\Sales\CreateSaleAction;
use App\Http\Requests\StoreSaleRequest;
use App\Models\Sale;
use App\Models\Shift;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SaleController extends Controller
{
    public function index(Request $request): Response
    {
        return Inertia::render('sales/index', ['sales' => Sale::query()->where('branch_id', $request->user()->branch_id)->with('customer:id,name')->withCount('items')->latest('sold_at')->paginate(50)]);
    }

    public function show(Request $request, Sale $sale): Response
    {
        abort_unless($sale->branch_id === $request->user()->branch_id, 403);

        return Inertia::render('sales/show', [
            'sale' => $sale->load(['items.returnItems', 'payments', 'customer']),
            'activeShift' => Shift::query()->where('status', 'open')->whereHas('register', fn ($query) => $query->where('branch_id', $request->user()->branch_id))->first(['id', 'code']),
        ]);
    }

    public function store(StoreSaleRequest $request, CreateSaleAction $action): JsonResponse
    {
        $sale = $action->execute($request->user(), $request->validated());

        return response()->json(['sale' => $sale, 'message' => 'Thanh toán thành công.'], 201);
    }
}
