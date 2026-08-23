<?php

namespace App\Http\Controllers;

use App\Actions\Shifts\CloseShiftAction;
use App\Actions\Shifts\OpenShiftAction;
use App\Actions\Shifts\ReconcileShiftAction;
use App\Actions\Shifts\RecordShiftCashMovementAction;
use App\Http\Requests\CloseShiftRequest;
use App\Http\Requests\IndexShiftsRequest;
use App\Http\Requests\OpenShiftRequest;
use App\Http\Requests\ReconcileShiftRequest;
use App\Http\Requests\StoreShiftCashMovementRequest;
use App\Models\Register;
use App\Models\Shift;
use App\Support\OrganizationDateRange;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class ShiftController extends Controller
{
    public function index(IndexShiftsRequest $request): Response
    {
        $search = trim((string) $request->string('search'));
        $status = $request->string('status')->toString() ?: 'all';
        $from = $request->validated('from');
        $to = $request->validated('to');
        $dateRange = OrganizationDateRange::fromLocalDates($from, $to, $request->user()->organization?->timezone ?? config('app.timezone'));
        $perPage = in_array($request->integer('per_page'), config('ux.pagination.options'), true) ? $request->integer('per_page') : config('ux.pagination.default');

        return Inertia::render('shifts/index', [
            'shifts' => Shift::query()->whereHas('register', fn ($query) => $query->where('branch_id', $request->user()->branch_id))->with('register:id,name')
                ->when($search !== '', fn ($query) => $query->where(fn ($searchQuery) => $searchQuery->where('code', 'like', "%{$search}%")->orWhereHas('register', fn ($registerQuery) => $registerQuery->where('name', 'like', "%{$search}%"))))
                ->when(in_array($status, ['open', 'closed'], true), fn ($query) => $query->where('status', $status))
                ->when($dateRange->fromUtc, fn ($query, $fromUtc) => $query->where('opened_at', '>=', $fromUtc))
                ->when($dateRange->toExclusiveUtc, fn ($query, $toExclusiveUtc) => $query->where('opened_at', '<', $toExclusiveUtc))
                ->latest('opened_at')->paginate($perPage)->withQueryString(),
            'registers' => Register::query()->where('branch_id', $request->user()->branch_id)->where('is_active', true)->get(['id', 'name']),
            'filters' => ['search' => $search, 'status' => $status, 'from' => $from, 'to' => $to, 'per_page' => $perPage],
        ]);
    }

    public function store(OpenShiftRequest $request, OpenShiftAction $action): RedirectResponse
    {
        $action->execute($request->user(), $request->validated());

        return back()->with('success', 'Đã mở ca bán hàng.');
    }

    public function close(CloseShiftRequest $request, Shift $shift, CloseShiftAction $action): RedirectResponse
    {
        $action->execute($request->user(), $shift, $request->validated());

        return back()->with('success', 'Đã chốt ca và ghi nhận chênh lệch tiền mặt.');
    }

    public function cashMovement(StoreShiftCashMovementRequest $request, Shift $shift, RecordShiftCashMovementAction $action): RedirectResponse
    {
        $action->execute($request->user(), $shift, $request->validated());

        return back()->with('success', 'Đã ghi nhận thu/chi tiền mặt trong ca.');
    }

    public function reconcile(ReconcileShiftRequest $request, Shift $shift, ReconcileShiftAction $action): RedirectResponse
    {
        $action->execute($request->user(), $shift, $request->validated());

        return back()->with('success', 'Đã xác nhận đối soát ca.');
    }
}
