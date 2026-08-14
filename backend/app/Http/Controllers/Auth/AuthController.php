<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

/**
 * Sanctum SPA cookie auth. These routes live under the "web" middleware
 * group (routes/web.php), not routes/api.php, so session + CSRF apply.
 * The Next.js frontend must GET /sanctum/csrf-cookie before calling any of
 * these. See "Hosting and domain" in the plan for the subdomain/CORS shape
 * this depends on.
 */
class AuthController extends Controller
{
    public function register(RegisterRequest $request): JsonResponse
    {
        $user = User::create([
            'name' => $request->string('name'),
            'email' => $request->string('email'),
            'password' => $request->string('password'),
            'timezone' => $request->string('timezone', 'UTC'),
        ]);

        Auth::login($user);
        $request->session()->regenerate();

        return response()->json($user, 201);
    }

    public function login(LoginRequest $request): JsonResponse
    {
        if (! Auth::attempt($request->only('email', 'password'), true)) {
            throw ValidationException::withMessages([
                'email' => ['These credentials do not match our records.'],
            ]);
        }

        $request->session()->regenerate();

        return response()->json(Auth::user());
    }

    public function logout(Request $request): JsonResponse
    {
        // Explicit "web" guard, since Sanctum's EnsureFrontendRequestsAreStateful
        // switches the default guard to "sanctum" (a RequestGuard with no
        // logout()) for stateful-domain requests, so Auth::logout() without
        // an explicit guard throws here.
        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json(['message' => 'Logged out.']);
    }
}
