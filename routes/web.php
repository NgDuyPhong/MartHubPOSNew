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
use Illuminate\Support\Facades\Route;

Route::get('/', fn () => redirect()->route('dashboard'))->name('home');

Route::middleware(['auth'])->group(function () {
    Route::get('dashboard', RetailDashboardController::class)->name('dashboard');
    Route::get('pos', PosController::class)->name('pos');
    Route::get('pos/freshness', [PosController::class, 'freshness'])->name('pos.freshness');
    Route::get('pos/snapshot', [PosController::class, 'snapshot'])->name('pos.snapshot');

    Route::get('products', [ProductController::class, 'index'])->name('products.index');
    Route::post('products', [ProductController::class, 'store'])->name('products.store');
    Route::put('products/{product}', [ProductController::class, 'update'])->name('products.update');
    Route::patch('products/{product}/quick-update', [ProductController::class, 'quickUpdate'])->name('products.quick-update');
    Route::get('categories', [CategoryController::class, 'index'])->name('categories.index');
    Route::post('categories', [CategoryController::class, 'store'])->name('categories.store');
    Route::put('categories/{category}', [CategoryController::class, 'update'])->name('categories.update');
    Route::delete('categories/{category}', [CategoryController::class, 'destroy'])->name('categories.destroy');
    Route::get('units', [UnitController::class, 'index'])->name('units.index');
    Route::post('units', [UnitController::class, 'store'])->name('units.store');
    Route::put('units/{unit}', [UnitController::class, 'update'])->name('units.update');
    Route::delete('units/{unit}', [UnitController::class, 'destroy'])->name('units.destroy');

    Route::get('inventory', [InventoryController::class, 'index'])->name('inventory.index');
    Route::get('stock-receipts', [StockReceiptController::class, 'index'])->name('stock-receipts.index');
    Route::post('stock-receipts', [StockReceiptController::class, 'store'])->name('stock-receipts.store');
    Route::get('stock-receipts/template', [StockReceiptController::class, 'template'])->name('stock-receipts.template');

    Route::get('shifts', [ShiftController::class, 'index'])->name('shifts.index');
    Route::post('shifts', [ShiftController::class, 'store'])->name('shifts.store');
    Route::post('shifts/{shift}/close', [ShiftController::class, 'close'])->name('shifts.close');
    Route::post('shifts/{shift}/cash-movements', [ShiftController::class, 'cashMovement'])->name('shifts.cash-movements.store');
    Route::post('shifts/{shift}/reconcile', [ShiftController::class, 'reconcile'])->name('shifts.reconcile');

    Route::get('sales', [SaleController::class, 'index'])->name('sales.index');
    Route::get('sales/{sale}', [SaleController::class, 'show'])->name('sales.show');
    Route::post('sales', [SaleController::class, 'store'])->middleware('throttle:60,1')->name('sales.store');
    Route::post('sales/{sale}/returns', [SaleReturnController::class, 'store'])->name('sales.returns.store');

    Route::get('customers', [CustomerController::class, 'index'])->name('customers.index');
    Route::post('customers', [CustomerController::class, 'store'])->name('customers.store');
    Route::post('customers/quick', [CustomerController::class, 'storeQuick'])->middleware('throttle:30,1')->name('customers.quick.store');
    Route::put('customers/{customer}', [CustomerController::class, 'update'])->name('customers.update');
    Route::post('customers/{customer}/payments', [CustomerController::class, 'payment'])->name('customers.payments.store');

    if (config('legacy-product-import.enabled', true)) {
        Route::get('legacy-imports', [LegacyImportController::class, 'index'])->name('legacy-imports.index');
        Route::post('legacy-imports/preview', [LegacyImportController::class, 'preview'])->name('legacy-imports.preview');
        Route::post('legacy-imports/execute', [LegacyImportController::class, 'execute'])->name('legacy-imports.execute');
    }
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
