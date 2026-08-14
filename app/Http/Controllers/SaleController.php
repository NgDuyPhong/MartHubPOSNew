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
        $search = trim((string) $request->string('search'));
        $status = $request->string('status')->toString() ?: 'all';
        $source = $request->string('source')->toString() ?: 'all';
        $from = preg_match('/^\\d{4}-\\d{2}-\\d{2}$/', $request->string('from')->toString()) ? $request->string('from')->toString() : null;
        $to = preg_match('/^\\d{4}-\\d{2}-\\d{2}$/', $request->string('to')->toString()) ? $request->string('to')->toString() : null;
        $sort = in_array($request->string('sort')->toString(), ['latest', 'oldest', 'total'], true) ? $request->string('sort')->toString() : 'latest';
        $perPage = in_array($request->integer('per_page'), config('ux.pagination.options'), true) ? $request->integer('per_page') : config('ux.pagination.default');
        $sales = Sale::query()->where('branch_id', $request->user()->branch_id)->with('customer:id,name')->withCount('items')
            ->when($search !== '', fn ($builder) => $builder->where(fn ($searchQuery) => $searchQuery->where('invoice_number', 'like', "%{$search}%")->orWhereHas('customer', fn ($customerQuery) => $customerQuery->where('name', 'like', "%{$search}%"))))
            ->when(in_array($status, ['paid', 'debt'], true), fn ($builder) => $builder->where('debt_amount', $status === 'debt' ? '>' : '=', 0))
            ->when(in_array($source, ['online', 'offline_sync'], true), fn ($builder) => $builder->where('source', $source))
            ->when($from, fn ($builder) => $builder->whereDate('sold_at', '>=', $from))
            ->when($to, fn ($builder) => $builder->whereDate('sold_at', '<=', $to))
            ->when($sort === 'total', fn ($builder) => $builder->orderBy('total', 'desc'))
            ->when($sort === 'oldest', fn ($builder) => $builder->oldest('sold_at'))
            ->when($sort === 'latest', fn ($builder) => $builder->latest('sold_at'))
            ->paginate($perPage)->withQueryString();

        return Inertia::render('sales/index', [
            'sales' => $sales,
            'filters' => ['search' => $search, 'status' => $status, 'source' => $source, 'from' => $from, 'to' => $to, 'sort' => $sort, 'per_page' => $perPage],
        ]);
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
