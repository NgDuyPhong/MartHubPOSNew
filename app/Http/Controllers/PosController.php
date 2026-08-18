<?php

namespace App\Http\Controllers;

use App\Services\PosDataService;
use App\Services\ResourceVersionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PosController extends Controller
{
    public function __construct(
        private readonly PosDataService $posData,
        private readonly ResourceVersionService $resourceVersions,
    ) {}

    public function __invoke(Request $request): Response
    {
        return Inertia::render('pos/index', $this->posData->bootstrap($request->user()));
    }

    public function freshness(Request $request): JsonResponse
    {
        $versions = $this->resourceVersions->versions($request->user());
        $requestedVersions = $request->input('versions', []);
        $requestedVersions = is_array($requestedVersions) ? $requestedVersions : [];
        $changed = array_keys(array_filter($versions, fn (string $version, string $resource): bool => (string) ($requestedVersions[$resource] ?? '') !== $version, ARRAY_FILTER_USE_BOTH));

        return $this->privateJson(['versions' => $versions, 'changed' => $changed]);
    }

    public function snapshot(Request $request): JsonResponse
    {
        $resources = $request->input('resources', 'catalog,categories');
        $resources = is_array($resources) ? $resources : explode(',', (string) $resources);
        $resources = array_values(array_filter(array_map('trim', $resources)));
        $unknownResources = array_diff($resources, ['catalog', 'categories', 'customers', 'activeShift', 'expiryAlerts', 'latestReceipt']);
        if ($unknownResources !== []) {
            return $this->privateJson(['message' => 'Resource snapshot không hợp lệ.', 'resources' => array_values($unknownResources)])->setStatusCode(422);
        }
        $snapshot = $this->posData->snapshot($request->user(), $resources);
        $etag = '"'.sha1(json_encode([
            'resources' => array_values(array_unique($resources)),
            'versions' => $snapshot['versions'],
        ], JSON_THROW_ON_ERROR)).'"';

        if ($request->header('If-None-Match') === $etag) {
            return response()->json(null, 304)->setEtag(trim($etag, '"'))->header('Cache-Control', 'private, no-store');
        }

        return $this->privateJson($snapshot)->setEtag(trim($etag, '"'));
    }

    private function privateJson(array $payload): JsonResponse
    {
        return response()->json($payload)->header('Cache-Control', 'private, no-store');
    }
}
