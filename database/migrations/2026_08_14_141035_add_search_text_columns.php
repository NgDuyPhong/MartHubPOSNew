<?php

use App\Support\VietnameseSearch;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        foreach (['products', 'customers', 'categories', 'units'] as $tableName) {
            if (! Schema::hasColumn($tableName, 'search_text')) {
                Schema::table($tableName, function (Blueprint $table): void {
                    $table->string('search_text', 500)->nullable()->index();
                });
            }
        }

        $columns = [
            'products' => ['name', 'sku'],
            'customers' => ['name', 'code', 'phone'],
            'categories' => ['name', 'code'],
            'units' => ['name', 'code'],
        ];

        foreach ($columns as $tableName => $fields) {
            $rows = DB::table($tableName)
                ->whereNull('search_text')
                ->select(array_merge(['id'], $fields))
                ->orderBy('id')
                ->get();

            DB::transaction(function () use ($tableName, $fields, $rows): void {
                foreach ($rows as $row) {
                    $values = array_map(static fn (string $field): ?string => $row->{$field} ?? null, $fields);
                    DB::table($tableName)->where('id', $row->id)->update(['search_text' => VietnameseSearch::combine(...$values)]);
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        foreach (['products', 'customers', 'categories', 'units'] as $tableName) {
            if (Schema::hasColumn($tableName, 'search_text')) {
                Schema::table($tableName, function (Blueprint $table) use ($tableName): void {
                    $table->dropIndex($tableName.'_search_text_index');
                    $table->dropColumn('search_text');
                });
            }
        }
    }
};
