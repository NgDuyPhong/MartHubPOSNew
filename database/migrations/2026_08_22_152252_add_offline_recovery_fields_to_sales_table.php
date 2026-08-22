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
        Schema::table('sales', function (Blueprint $table) {
            $table->foreignId('original_actor_id')->nullable()->after('user_id')->constrained('users')->restrictOnDelete();
            $table->foreignId('recovered_by')->nullable()->after('original_actor_id')->constrained('users')->nullOnDelete();
            $table->index(['recovered_by', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('sales', function (Blueprint $table) {
            $table->dropForeign(['recovered_by']);
            $table->dropForeign(['original_actor_id']);
            $table->dropIndex(['recovered_by', 'created_at']);
            $table->dropColumn(['original_actor_id', 'recovered_by']);
        });
    }
};
