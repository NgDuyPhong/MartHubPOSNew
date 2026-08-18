<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreUnitRequest;
use App\Models\Unit;
use App\Services\ResourceVersionService;
use App\Support\VietnameseSearch;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class UnitController extends Controller
{
    public function __construct(private readonly ResourceVersionService $resourceVersions) {}

    public function index(Request $request): Response
    {
        $organizationId = $request->user()->organization_id;
        $search = trim((string) $request->string('search'));
        $normalizedSearch = VietnameseSearch::normalize($search);
        $status = $request->string('status')->toString() ?: 'all';
        $perPage = in_array($request->integer('per_page'), config('ux.pagination.options'), true) ? $request->integer('per_page') : config('ux.pagination.default');

        $units = Unit::query()
            ->where('organization_id', $organizationId)
            ->when($normalizedSearch !== '', fn ($query) => $query->where('search_text', 'like', "%{$normalizedSearch}%"))
            ->when(in_array($status, ['active', 'inactive'], true), fn ($query) => $query->where('is_active', $status === 'active'))
            ->withCount('productUnits')
            ->orderBy('name')
            ->paginate($perPage)
            ->withQueryString();

        return Inertia::render('units/index', [
            'units' => $units,
            'filters' => ['search' => $search, 'status' => $status, 'per_page' => $perPage],
            'canManageCatalog' => $request->user()->canManageCatalog(),
        ]);
    }

    public function store(StoreUnitRequest $request): RedirectResponse
    {
        Unit::query()->create([...$request->validated(), 'organization_id' => $request->user()->organization_id]);

        return back()->with('success', 'Đã tạo đơn vị.');
    }

    public function update(StoreUnitRequest $request, Unit $unit): RedirectResponse
    {
        abort_unless($unit->organization_id === $request->user()->organization_id, 403);
        $data = $request->validated();
        abort_if(($data['is_active'] ?? true) === false && $unit->is_active && $unit->productUnits()->exists(), 409, 'Đơn vị đang được sản phẩm sử dụng. Hãy chuyển sản phẩm sang đơn vị khác trước khi ngừng sử dụng.');
        DB::transaction(function () use ($unit, $data, $request): void {
            $affectsCatalog = $unit->productUnits()->exists();
            $unit->update($data);
            if ($affectsCatalog) {
                $this->resourceVersions->bumpAfterCommit($request->user(), ['catalog']);
            }
        });

        return back()->with('success', 'Đã cập nhật đơn vị.');
    }

    public function destroy(Request $request, Unit $unit): RedirectResponse
    {
        abort_unless($unit->organization_id === $request->user()->organization_id && $request->user()->canManageCatalog(), 403);
        abort_if($unit->productUnits()->exists(), 409, 'Đơn vị đang được sản phẩm sử dụng. Hãy ngừng sử dụng thay vì xóa.');
        $unit->delete();

        return back()->with('success', 'Đã xóa đơn vị.');
    }
}
