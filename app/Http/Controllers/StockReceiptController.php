<?php

namespace App\Http\Controllers;

use App\Actions\Stock\CreateStockReceiptAction;
use App\Http\Requests\StoreStockReceiptRequest;
use App\Models\ProductUnit;
use App\Models\StockReceipt;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class StockReceiptController extends Controller
{
    public function index(Request $request): Response
    {
        return Inertia::render('stock-receipts/index', [
            'receipts' => StockReceipt::query()->where('branch_id', $request->user()->branch_id)->withCount('items')->latest('received_at')->paginate(30),
            'productUnits' => ProductUnit::query()->whereHas('variant.product', fn ($query) => $query->where('organization_id', $request->user()->organization_id))->with(['variant.product:id,name,sku,track_lot,track_expiry', 'unit:id,code,name', 'barcodes:id,product_unit_id,value'])->get(),
        ]);
    }

    public function store(StoreStockReceiptRequest $request, CreateStockReceiptAction $action): RedirectResponse
    {
        $action->execute($request->user(), $request->validated());

        return back()->with('success', 'Đã nhập kho và cập nhật giá vốn nhập cuối.');
    }

    public function template(): StreamedResponse
    {
        return response()->streamDownload(function () {
            $stream = fopen('php://output', 'w');
            fwrite($stream, "\xEF\xBB\xBF");
            fputcsv($stream, ['barcode_or_sku', 'unit_code', 'quantity', 'unit_cost', 'lot_number', 'expiry_date']);
            fputcsv($stream, ['893000000001', 'LON', '24', '9000', 'LO-001', '2027-12-31']);
            fclose($stream);
        }, 'mau-nhap-kho.csv', ['Content-Type' => 'text/csv; charset=UTF-8']);
    }
}
