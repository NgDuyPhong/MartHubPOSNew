<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('product_units', function (Blueprint $table): void {
            $table->boolean('allows_fractional_quantity')->default(false)->after('is_default_sale');
        });

        Schema::table('sales', function (Blueprint $table): void {
            $table->timestamp('synced_at')->nullable()->after('sold_at');
        });

        Schema::table('shifts', function (Blueprint $table): void {
            $table->boolean('needs_reconciliation')->default(false)->after('closing_note')->index();
            $table->timestamp('reconciled_at')->nullable()->after('needs_reconciliation');
            $table->foreignId('reconciled_by')->nullable()->after('reconciled_at')->constrained('users')->nullOnDelete();
            $table->text('reconciliation_note')->nullable()->after('reconciled_by');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('shifts', function (Blueprint $table): void {
            $table->dropForeign(['reconciled_by']);
            $table->dropColumn(['needs_reconciliation', 'reconciled_at', 'reconciled_by', 'reconciliation_note']);
        });

        Schema::table('sales', function (Blueprint $table): void {
            $table->dropColumn('synced_at');
        });

        Schema::table('product_units', function (Blueprint $table): void {
            $table->dropColumn('allows_fractional_quantity');
        });
    }
};
