<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class EnsureActiveAccount
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->user()?->is_active === true) {
            return $next($request);
        }

        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        if ($request->expectsJson()) {
            return response()->json([
                'code' => 'ACCOUNT_INACTIVE',
                'message' => __('auth.failed'),
            ], 401);
        }

        return redirect()->route('login')->withErrors([
            'email' => __('auth.failed'),
        ]);
    }
}
