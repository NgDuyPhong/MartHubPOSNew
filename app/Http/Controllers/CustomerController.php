<?php

namespace App\Http\Controllers;

use App\Actions\Customers\CreateCustomerAction;
use App\Actions\Customers\RecordDebtPaymentAction;
use App\Http\Requests\StoreCustomerRequest;
use App\Http\Requests\StoreDebtPaymentRequest;
use App\Models\Customer;
use App\Models\Shift;
use App\Support\VietnameseSearch;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CustomerController extends Controller
{
    public function index(Request $request): Response
    {
        $search = trim((string) $request->string('search'));
        $normalizedSearch = VietnameseSearch::normalize($search);
        $status = $request->string('status')->toString() ?: 'all';
        $debt = $request->string('debt')->toString() ?: 'all';
        $perPage = in_array($request->integer('per_page'), config('ux.pagination.options'), true) ? $request->integer('per_page') : config('ux.pagination.default');
        $customers = Customer::query()->where('organization_id', $request->user()->organization_id)
            ->when($normalizedSearch !== '', fn ($query) => $query->where('search_text', 'like', "%{$normalizedSearch}%"))
            ->when(in_array($status, ['active', 'inactive'], true), fn ($query) => $query->where('is_active', $status === 'active'))
            ->when($debt === 'with_debt', fn ($query) => $query->whereRaw('(select coalesce(sum(debit), 0) - coalesce(sum(credit), 0) from customer_credit_entries where customer_id = customers.id) > 0'))
            ->when($debt === 'without_debt', fn ($query) => $query->whereRaw('(select coalesce(sum(debit), 0) - coalesce(sum(credit), 0) from customer_credit_entries where customer_id = customers.id) <= 0'))
            ->withSum('creditEntries as debit_total', 'debit')->withSum('creditEntries as credit_total', 'credit')->orderBy('name')->paginate($perPage)->withQueryString();

        return Inertia::render('customers/index', [
            'customers' => $customers,
            'filters' => ['search' => $search, 'status' => $status, 'debt' => $debt, 'per_page' => $perPage],
            'activeShift' => Shift::query()->where('status', 'open')->whereHas('register', fn ($query) => $query->where('branch_id', $request->user()->branch_id))->first(['id', 'code']),
        ]);
    }

    public function store(StoreCustomerRequest $request, CreateCustomerAction $action): RedirectResponse
    {
        $action->execute($request->user(), $request->validated());

        return back()->with('success', 'Đã thêm khách hàng.');
    }

    public function storeQuick(StoreCustomerRequest $request, CreateCustomerAction $action): JsonResponse
    {
        $customer = $action->execute($request->user(), $request->validated());

        return response()->json([
            'customer' => [
                'id' => $customer->id,
                'code' => $customer->code,
                'name' => $customer->name,
                'phone' => $customer->phone,
                'balance' => 0,
            ],
            'message' => 'Đã thêm khách hàng.',
        ], 201);
    }

    public function update(StoreCustomerRequest $request, Customer $customer): RedirectResponse
    {
        abort_unless($customer->organization_id === $request->user()->organization_id, 403);
        $customer->update($request->validated());

        return back()->with('success', 'Đã cập nhật khách hàng.');
    }

    public function payment(StoreDebtPaymentRequest $request, Customer $customer, RecordDebtPaymentAction $action): RedirectResponse
    {
        $action->execute($request->user(), $customer, $request->validated());

        return back()->with('success', 'Đã ghi nhận thu công nợ.');
    }
}
