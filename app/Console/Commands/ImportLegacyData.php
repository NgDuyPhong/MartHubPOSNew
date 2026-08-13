<?php

namespace App\Console\Commands;

use App\Services\LegacyImportService;
use Illuminate\Console\Command;
use Throwable;

class ImportLegacyData extends Command
{
    protected $signature = 'legacy:import
        {bundle : Path to a marthub-legacy/v1 ZIP bundle}
        {--organization= : Target organization ID; defaults to the oldest organization}
        {--branch= : Target branch ID; defaults to the oldest branch in the organization}
        {--execute : Persist the validated bundle; without this flag the command only profiles it}
        {--force : Run once even when the post-cutover feature flag is disabled}';

    protected $description = 'Validate, preview and import a one-time legacy product catalog bundle';

    /**
     * Execute the console command.
     */
    public function handle(LegacyImportService $importer): int
    {
        try {
            $result = $importer->import($this->argument('bundle'), [
                'organization_id' => $this->option('organization') !== null ? (int) $this->option('organization') : null,
                'branch_id' => $this->option('branch') !== null ? (int) $this->option('branch') : null,
                'execute' => (bool) $this->option('execute'),
                'force' => (bool) $this->option('force'),
            ]);
        } catch (Throwable $exception) {
            $this->error($exception->getMessage());

            return self::FAILURE;
        }

        $this->info(sprintf('Legacy import %s: %s', $result['export_id'] ?? 'unknown', $result['status']));
        $this->line(json_encode($result, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));

        return self::SUCCESS;
    }
}
