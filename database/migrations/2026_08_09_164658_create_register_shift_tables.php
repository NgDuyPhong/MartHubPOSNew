<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('registers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('branch_id')->constrained()->cascadeOnDelete();
            $table->string('code');
            $table->string('name');
            $table->boolean('is_active')->default(true)->index();
            $table->timestamps();
            $table->unique(['branch_id', 'code']);
        });

        Schema::create('shifts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('register_id')->constrained()->cascadeOnDelete();
            $table->foreignId('opened_by')->constrained('users')->restrictOnDelete();
            $table->foreignId('closed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('code')->unique();
            $table->string('status')->default('open')->index();
            $table->unsignedBigInteger('opening_cash')->default(0);
            $table->unsignedBigInteger('expected_cash')->nullable();
            $table->unsignedBigInteger('actual_cash')->nullable();
            $table->bigInteger('difference_cash')->nullable();
            $table->timestamp('opened_at')->index();
            $table->timestamp('closed_at')->nullable()->index();
            $table->text('closing_note')->nullable();
            $table->timestamps();
        });

        Schema::create('shift_participants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('shift_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->timestamp('joined_at');
            $table->timestamp('left_at')->nullable();
            $table->timestamps();
            $table->unique(['shift_id', 'user_id']);
        });

        Schema::create('shift_cash_movements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('shift_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->restrictOnDelete();
            $table->string('type')->index();
            $table->unsignedBigInteger('amount');
            $table->string('reason');
            $table->timestamps();
        });

        Schema::create('shift_cash_counts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('shift_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->restrictOnDelete();
            $table->unsignedBigInteger('denomination');
            $table->unsignedInteger('quantity');
            $table->unsignedBigInteger('subtotal');
            $table->timestamps();
            $table->unique(['shift_id', 'denomination']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('shift_cash_counts');
        Schema::dropIfExists('shift_cash_movements');
        Schema::dropIfExists('shift_participants');
        Schema::dropIfExists('shifts');
        Schema::dropIfExists('registers');
    }
};
