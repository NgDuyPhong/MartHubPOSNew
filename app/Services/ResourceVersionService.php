<?php

namespace App\Services;

use App\Models\PosResourceVersion;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class ResourceVersionService
{
    /** @var list<string> */
    private const ORGANIZATION_RESOURCES = ['catalog', 'customers'];

    /** @var list<string> */
    private const BRANCH_RESOURCES = ['inventory', 'activeShift'];

    /** @return array{catalog: string, inventory: string, customers: string, activeShift: string} */
    public function versions(User $user): array
    {
        return [
            'catalog' => (string) $this->current('catalog', $user->organization_id),
            'inventory' => (string) $this->current('inventory', null, $user->branch_id),
            'customers' => (string) $this->current('customers', $user->organization_id),
            'activeShift' => (string) $this->current('activeShift', null, $user->branch_id),
        ];
    }

    /** @param list<string> $resources */
    public function bumpAfterCommit(User $user, array $resources): void
    {
        $organizationId = $user->organization_id;
        $branchId = $user->branch_id;
        DB::afterCommit(fn () => $this->bump($resources, $organizationId, $branchId));
    }

    /** @param list<string> $resources */
    public function bump(array $resources, ?int $organizationId, ?int $branchId): void
    {
        DB::transaction(function () use ($resources, $organizationId, $branchId): void {
            foreach (array_unique($resources) as $resource) {
                if (in_array($resource, self::ORGANIZATION_RESOURCES, true)) {
                    $this->increment($resource, $organizationId, null);
                }
                if (in_array($resource, self::BRANCH_RESOURCES, true)) {
                    $this->increment($resource, null, $branchId);
                }
            }
        });
    }

    private function current(string $resource, ?int $organizationId = null, ?int $branchId = null): int
    {
        return (int) (PosResourceVersion::query()->where('scope_key', $this->scopeKey($resource, $organizationId, $branchId))->value('version') ?? 1);
    }

    private function increment(string $resource, ?int $organizationId, ?int $branchId): void
    {
        $scopeKey = $this->scopeKey($resource, $organizationId, $branchId);
        PosResourceVersion::query()->insertOrIgnore([
            'resource' => $resource,
            'organization_id' => $organizationId,
            'branch_id' => $branchId,
            'scope_key' => $scopeKey,
            'version' => 1,
        ]);

        PosResourceVersion::query()
            ->where('scope_key', $scopeKey)
            ->lockForUpdate()
            ->increment('version');
    }

    private function scopeKey(string $resource, ?int $organizationId, ?int $branchId): string
    {
        return sprintf('%s:%s:%s', $resource, $organizationId ?? '-', $branchId ?? '-');
    }
}
