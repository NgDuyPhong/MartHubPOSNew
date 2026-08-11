<?php

namespace App\Http\Controllers;

use App\Actions\Shifts\CloseShiftAction;
use App\Actions\Shifts\OpenShiftAction;
use App\Actions\Shifts\RecordShiftCashMovementAction;
use App\Http\Requests\CloseShiftRequest;
use App\Http\Requests\OpenShiftRequest;
use App\Http\Requests\StoreShiftCashMovementRequest;
use App\Models\Register;
use App\Models\Shift;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ShiftController extends Controller
{
    public function index(Request $request): Response
    {
        return Inertia::render('shifts/index', [
            'shifts' => Shift::query()->whereHas('register', fn ($query) => $query->where('branch_id', $request->user()->branch_id))->with('register:id,name')->latest('opened_at')->paginate(30),
            'registers' => Register::query()->where('branch_id', $request->user()->branch_id)->where('is_active', true)->get(['id', 'name']),
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
}
