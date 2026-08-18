<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pos_resource_versions', function (Blueprint $table) {
            $table->id();
            $table->string('resource', 50);
            $table->foreignId('organization_id')->nullable()->constrained()->cascadeOnDelete();
            $table->foreignId('branch_id')->nullable()->constrained()->cascadeOnDelete();
            $table->string('scope_key')->unique();
            $table->unsignedBigInteger('version')->default(1);
            $table->timestamps();
            $table->index(['resource', 'organization_id', 'branch_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pos_resource_versions');
    }
};
