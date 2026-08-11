<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sales', function (Blueprint $table) {
            $table->id();
            $table->uuid('public_id')->unique();
            $table->foreignId('branch_id')->constrained()->cascadeOnDelete();
            $table->foreignId('shift_id')->constrained()->restrictOnDelete();
            $table->foreignId('user_id')->constrained()->restrictOnDelete();
            $table->foreignId('customer_id')->nullable()->constrained()->nullOnDelete();
            $table->string('invoice_number')->unique();
            $table->string('status')->default('completed')->index();
            $table->string('source')->default('online')->index();
            $table->unsignedBigInteger('subtotal');
            $table->unsignedBigInteger('discount_amount')->default(0);
            $table->unsignedBigInteger('total');
            $table->unsignedBigInteger('paid_amount')->default(0);
            $table->unsignedBigInteger('debt_amount')->default(0);
            $table->unsignedBigInteger('change_amount')->default(0);
            $table->text('note')->nullable();
            $table->timestamp('sold_at')->index();
            $table->timestamps();
            $table->index(['branch_id', 'sold_at']);
        });

        Schema::create('sale_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sale_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_variant_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('product_unit_id')->nullable()->constrained()->nullOnDelete();
            $table->string('product_sku');
            $table->string('product_name');
            $table->string('variant_name')->nullable();
            $table->string('unit_code');
            $table->string('unit_name');
            $table->decimal('conversion_to_base', 18, 6);
            $table->decimal('quantity', 18, 6);
            $table->decimal('quantity_base', 18, 6);
            $table->unsignedBigInteger('unit_price');
            $table->unsignedBigInteger('original_unit_price');
            $table->unsignedBigInteger('discount_amount')->default(0);
            $table->unsignedBigInteger('line_total');
            $table->unsignedBigInteger('cost_base_snapshot')->default(0);
            $table->unsignedBigInteger('cost_total_snapshot')->default(0);
            $table->boolean('price_overridden')->default(false);
            $table->timestamps();
        });

        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sale_id')->nullable()->constrained()->cascadeOnDelete();
            $table->foreignId('customer_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('shift_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('user_id')->constrained()->restrictOnDelete();
            $table->string('method')->index();
            $table->string('direction')->default('in')->index();
            $table->unsignedBigInteger('amount');
            $table->string('status')->default('confirmed')->index();
            $table->string('reference')->nullable();
            $table->boolean('manually_confirmed')->default(false);
            $table->timestamp('paid_at')->index();
            $table->timestamps();
        });

        Schema::create('payment_allocations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('payment_id')->constrained()->cascadeOnDelete();
            $table->foreignId('customer_credit_entry_id')->constrained()->cascadeOnDelete();
            $table->unsignedBigInteger('amount');
            $table->timestamps();
            $table->unique(['payment_id', 'customer_credit_entry_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payment_allocations');
        Schema::dropIfExists('payments');
        Schema::dropIfExists('sale_items');
        Schema::dropIfExists('sales');
    }
};
