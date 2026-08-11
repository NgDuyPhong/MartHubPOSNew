<?php

namespace App\Http\Controllers;

use App\Actions\Returns\CreateSaleReturnAction;
use App\Http\Requests\StoreSaleReturnRequest;
use App\Models\Sale;
use Illuminate\Http\RedirectResponse;

class SaleReturnController extends Controller
{
    public function store(StoreSaleReturnRequest $request, Sale $sale, CreateSaleReturnAction $action): RedirectResponse
    {
        $return = $action->execute($request->user(), $sale, $request->validated());

        return back()->with('success', "Đã tạo phiếu {$return->return_number}.");
    }
}
