<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stock_receipts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('branch_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->restrictOnDelete();
            $table->string('receipt_number')->unique();
            $table->string('source')->default('manual')->index();
            $table->string('status')->default('completed')->index();
            $table->string('supplier_name')->nullable();
            $table->text('note')->nullable();
            $table->timestamp('received_at')->index();
            $table->timestamps();
        });

        Schema::create('stock_receipt_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('stock_receipt_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_variant_id')->constrained()->restrictOnDelete();
            $table->foreignId('product_unit_id')->constrained()->restrictOnDelete();
            $table->foreignId('inventory_lot_id')->nullable()->constrained()->nullOnDelete();
            $table->decimal('quantity', 18, 6);
            $table->decimal('conversion_to_base', 18, 6);
            $table->decimal('quantity_base', 18, 6);
            $table->unsignedBigInteger('unit_cost');
            $table->unsignedBigInteger('cost_base');
            $table->unsignedBigInteger('line_total');
            $table->string('lot_number')->nullable();
            $table->date('expiry_date')->nullable();
            $table->timestamps();
        });

        Schema::create('sale_returns', function (Blueprint $table) {
            $table->id();
            $table->uuid('public_id')->unique();
            $table->foreignId('sale_id')->constrained()->restrictOnDelete();
            $table->foreignId('shift_id')->constrained()->restrictOnDelete();
            $table->foreignId('user_id')->constrained()->restrictOnDelete();
            $table->string('return_number')->unique();
            $table->string('type')->default('refund')->index();
            $table->unsignedBigInteger('total');
            $table->string('refund_method')->nullable();
            $table->string('reason');
            $table->timestamp('returned_at')->index();
            $table->timestamps();
        });

        Schema::create('sale_return_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sale_return_id')->constrained()->cascadeOnDelete();
            $table->foreignId('sale_item_id')->constrained()->restrictOnDelete();
            $table->decimal('quantity', 18, 6);
            $table->decimal('quantity_base', 18, 6);
            $table->unsignedBigInteger('refund_amount');
            $table->string('condition')->default('resellable');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sale_return_items');
        Schema::dropIfExists('sale_returns');
        Schema::dropIfExists('stock_receipt_items');
        Schema::dropIfExists('stock_receipts');
    }
};
