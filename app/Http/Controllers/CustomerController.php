<?php

namespace App\Http\Controllers;

use App\Actions\Customers\RecordDebtPaymentAction;
use App\Http\Requests\StoreCustomerRequest;
use App\Http\Requests\StoreDebtPaymentRequest;
use App\Models\Customer;
use App\Models\Shift;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CustomerController extends Controller
{
    public function index(Request $request): Response
    {
        $customers = Customer::query()->where('organization_id', $request->user()->organization_id)->withSum('creditEntries as debit_total', 'debit')->withSum('creditEntries as credit_total', 'credit')->orderBy('name')->paginate(50);

        return Inertia::render('customers/index', [
            'customers' => $customers,
            'activeShift' => Shift::query()->where('status', 'open')->whereHas('register', fn ($query) => $query->where('branch_id', $request->user()->branch_id))->first(['id', 'code']),
        ]);
    }

    public function store(StoreCustomerRequest $request): RedirectResponse
    {
        Customer::query()->create(array_merge($request->validated(), [
            'organization_id' => $request->user()->organization_id,
            'code' => 'KH-'.str_pad((string) (Customer::query()->where('organization_id', $request->user()->organization_id)->count() + 1), 5, '0', STR_PAD_LEFT),
            'is_active' => true,
        ]));

        return back()->with('success', 'Đã thêm khách hàng.');
    }

    public function payment(StoreDebtPaymentRequest $request, Customer $customer, RecordDebtPaymentAction $action): RedirectResponse
    {
        $action->execute($request->user(), $customer, $request->validated());

        return back()->with('success', 'Đã ghi nhận thu công nợ.');
    }
}
