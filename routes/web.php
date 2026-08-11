<?php

use App\Http\Controllers\CustomerController;
use App\Http\Controllers\InventoryController;
use App\Http\Controllers\PosController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\RetailDashboardController;
use App\Http\Controllers\SaleController;
use App\Http\Controllers\SaleReturnController;
use App\Http\Controllers\ShiftController;
use App\Http\Controllers\StockReceiptController;
use Illuminate\Support\Facades\Route;

Route::get('/', fn () => redirect()->route('dashboard'))->name('home');

Route::middleware(['auth'])->group(function () {
    Route::get('dashboard', RetailDashboardController::class)->name('dashboard');
    Route::get('pos', PosController::class)->name('pos');

    Route::get('products', [ProductController::class, 'index'])->name('products.index');
    Route::post('products', [ProductController::class, 'store'])->name('products.store');
    Route::put('products/{product}', [ProductController::class, 'update'])->name('products.update');

    Route::get('inventory', [InventoryController::class, 'index'])->name('inventory.index');
    Route::get('stock-receipts', [StockReceiptController::class, 'index'])->name('stock-receipts.index');
    Route::post('stock-receipts', [StockReceiptController::class, 'store'])->name('stock-receipts.store');
    Route::get('stock-receipts/template', [StockReceiptController::class, 'template'])->name('stock-receipts.template');

    Route::get('shifts', [ShiftController::class, 'index'])->name('shifts.index');
    Route::post('shifts', [ShiftController::class, 'store'])->name('shifts.store');
    Route::post('shifts/{shift}/close', [ShiftController::class, 'close'])->name('shifts.close');
    Route::post('shifts/{shift}/cash-movements', [ShiftController::class, 'cashMovement'])->name('shifts.cash-movements.store');

    Route::get('sales', [SaleController::class, 'index'])->name('sales.index');
    Route::get('sales/{sale}', [SaleController::class, 'show'])->name('sales.show');
    Route::post('sales', [SaleController::class, 'store'])->middleware('throttle:60,1')->name('sales.store');
    Route::post('sales/{sale}/returns', [SaleReturnController::class, 'store'])->name('sales.returns.store');

    Route::get('customers', [CustomerController::class, 'index'])->name('customers.index');
    Route::post('customers', [CustomerController::class, 'store'])->name('customers.store');
    Route::post('customers/{customer}/payments', [CustomerController::class, 'payment'])->name('customers.payments.store');
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
