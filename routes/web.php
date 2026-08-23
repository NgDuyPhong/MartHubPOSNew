<?php

use App\Http\Controllers\CategoryController;
use App\Http\Controllers\CustomerController;
use App\Http\Controllers\InventoryController;
use App\Http\Controllers\LegacyImportController;
use App\Http\Controllers\PosController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\RetailDashboardController;
use App\Http\Controllers\SaleController;
use App\Http\Controllers\SaleReturnController;
use App\Http\Controllers\ShiftController;
use App\Http\Controllers\StockReceiptController;
use App\Http\Controllers\UnitController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function (Request $request) {
    return $request->user() ? redirect()->route('dashboard') : Inertia::render('welcome');
})->name('home');

Route::middleware(['auth', 'active'])->group(function () {
    Route::get('dashboard', RetailDashboardController::class)->middleware('capability:report.view')->name('dashboard');
    Route::get('pos', PosController::class)->middleware('capability:pos.sell')->name('pos');
    Route::get('pos/freshness', [PosController::class, 'freshness'])->middleware('capability:pos.sell')->name('pos.freshness');
    Route::get('pos/snapshot', [PosController::class, 'snapshot'])->middleware('capability:pos.sell')->name('pos.snapshot');

    Route::get('products', [ProductController::class, 'index'])->middleware('capability:catalog.manage')->name('products.index');
    Route::get('products/create', [ProductController::class, 'create'])->middleware('capability:catalog.manage')->name('products.create');
    Route::post('products', [ProductController::class, 'store'])->middleware('capability:catalog.manage')->name('products.store');
    Route::get('products/{product}/edit', [ProductController::class, 'edit'])->middleware('capability:catalog.manage')->name('products.edit');
    Route::put('products/{product}', [ProductController::class, 'update'])->middleware('capability:catalog.manage')->name('products.update');
    Route::patch('products/{product}/status', [ProductController::class, 'updateStatus'])->middleware('capability:catalog.manage')->name('products.status.update');
    Route::patch('products/{product}/quick-update', [ProductController::class, 'quickUpdate'])->middleware('capability:catalog.manage')->name('products.quick-update');
    Route::get('categories', [CategoryController::class, 'index'])->middleware('capability:catalog.manage')->name('categories.index');
    Route::post('categories', [CategoryController::class, 'store'])->middleware('capability:catalog.manage')->name('categories.store');
    Route::put('categories/{category}', [CategoryController::class, 'update'])->middleware('capability:catalog.manage')->name('categories.update');
    Route::delete('categories/{category}', [CategoryController::class, 'destroy'])->middleware('capability:catalog.manage')->name('categories.destroy');
    Route::get('units', [UnitController::class, 'index'])->middleware('capability:catalog.manage')->name('units.index');
    Route::post('units', [UnitController::class, 'store'])->middleware('capability:catalog.manage')->name('units.store');
    Route::put('units/{unit}', [UnitController::class, 'update'])->middleware('capability:catalog.manage')->name('units.update');
    Route::delete('units/{unit}', [UnitController::class, 'destroy'])->middleware('capability:catalog.manage')->name('units.destroy');

    Route::get('inventory', [InventoryController::class, 'index'])->middleware('capability:inventory.view')->name('inventory.index');
    Route::get('stock-receipts', [StockReceiptController::class, 'index'])->middleware('capability:inventory.receive')->name('stock-receipts.index');
    Route::post('stock-receipts', [StockReceiptController::class, 'store'])->middleware('capability:inventory.receive')->name('stock-receipts.store');
    Route::get('stock-receipts/template', [StockReceiptController::class, 'template'])->middleware('capability:inventory.receive')->name('stock-receipts.template');

    Route::get('shifts', [ShiftController::class, 'index'])->middleware('capability:shift.view')->name('shifts.index');
    Route::post('shifts', [ShiftController::class, 'store'])->middleware('capability:shift.open')->name('shifts.store');
    Route::post('shifts/{shift}/close', [ShiftController::class, 'close'])->middleware('capability:shift.close')->name('shifts.close');
    Route::post('shifts/{shift}/cash-movements', [ShiftController::class, 'cashMovement'])->middleware('capability:shift.cash_movement')->name('shifts.cash-movements.store');
    Route::post('shifts/{shift}/reconcile', [ShiftController::class, 'reconcile'])->middleware('capability:shift.reconcile')->name('shifts.reconcile');

    Route::get('sales', [SaleController::class, 'index'])->middleware('capability:sales.view')->name('sales.index');
    Route::get('sales/{sale}', [SaleController::class, 'show'])->middleware('capability:sales.view')->name('sales.show');
    Route::post('sales', [SaleController::class, 'store'])->middleware(['capability:pos.sell', 'throttle:60,1'])->name('sales.store');
    Route::post('sales/{sale}/returns', [SaleReturnController::class, 'store'])->middleware('capability:sales.return')->name('sales.returns.store');

    Route::get('customers', [CustomerController::class, 'index'])->middleware('capability:customer.view')->name('customers.index');
    Route::post('customers', [CustomerController::class, 'store'])->middleware('capability:customer.manage')->name('customers.store');
    Route::post('customers/quick', [CustomerController::class, 'storeQuick'])->middleware(['capability:customer.manage', 'throttle:30,1'])->name('customers.quick.store');
    Route::put('customers/{customer}', [CustomerController::class, 'update'])->middleware('capability:customer.manage')->name('customers.update');
    Route::post('customers/{customer}/payments', [CustomerController::class, 'payment'])->middleware('capability:debt.collect')->name('customers.payments.store');

    if (config('legacy-product-import.enabled', true)) {
        Route::get('legacy-imports', [LegacyImportController::class, 'index'])->middleware('capability:import.legacy')->name('legacy-imports.index');
        Route::post('legacy-imports/preview', [LegacyImportController::class, 'preview'])->middleware('capability:import.legacy')->name('legacy-imports.preview');
        Route::post('legacy-imports/execute', [LegacyImportController::class, 'execute'])->middleware('capability:import.legacy')->name('legacy-imports.execute');
    }
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
