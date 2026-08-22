<?php

namespace App\Http\Controllers;

use App\Http\Requests\LegacyImportRequest;
use App\Services\LegacyImportService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

class LegacyImportController extends Controller
{
    public function index(Request $request): Response
    {
        $this->ensureOperator($request);

        return Inertia::render('legacy-imports/index');
    }

    public function preview(LegacyImportRequest $request, LegacyImportService $service): RedirectResponse
    {
        try {
            $path = $request->file('bundle')->store('legacy-imports', 'local');
            $result = $service->import(Storage::disk('local')->path($path));

            return back()->with('legacyImportPreview', $result);
        } catch (Throwable $exception) {
            return back()->withErrors(['bundle' => $exception->getMessage()]);
        } finally {
            if (isset($path)) {
                Storage::disk('local')->delete($path);
            }
        }
    }

    public function execute(LegacyImportRequest $request, LegacyImportService $service): RedirectResponse
    {
        try {
            $path = $request->file('bundle')->store('legacy-imports', 'local');
            $result = $service->import(Storage::disk('local')->path($path), [
                'organization_id' => $request->user()->organization_id,
                'branch_id' => $request->user()->branch_id,
                'execute' => true,
            ]);

            return back()->with('success', 'Đã import catalog sản phẩm cũ: '.($result['export_id'] ?? 'unknown').'.');
        } catch (Throwable $exception) {
            return back()->withErrors(['bundle' => $exception->getMessage()]);
        } finally {
            if (isset($path)) {
                Storage::disk('local')->delete($path);
            }
        }
    }

    private function ensureOperator(Request $request): void
    {
        abort_unless($request->user()?->hasCapability('import.legacy') === true, 403);
    }
}
