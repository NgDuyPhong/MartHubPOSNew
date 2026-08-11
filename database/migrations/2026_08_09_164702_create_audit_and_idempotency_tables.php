<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('approval_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('requested_by')->constrained('users')->restrictOnDelete();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('action')->index();
            $table->string('approvable_type')->nullable();
            $table->unsignedBigInteger('approvable_id')->nullable();
            $table->string('status')->default('approved')->index();
            $table->json('context')->nullable();
            $table->timestamps();
            $table->index(['approvable_type', 'approvable_id']);
        });

        Schema::create('idempotency_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->string('key');
            $table->string('operation')->index();
            $table->string('request_hash');
            $table->unsignedSmallInteger('response_status')->default(200);
            $table->json('response_body')->nullable();
            $table->timestamp('expires_at')->nullable()->index();
            $table->timestamps();
            $table->unique(['organization_id', 'key']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('idempotency_records');
        Schema::dropIfExists('approval_events');
    }
};
