<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Sanctum SPA token auth for the separate Next.js frontend — see
        // Technical direction / Hosting and domain in the plan.
        $middleware->statefulApi();

        // Nothing under routes/api.php was rate limited at all before this
        // — 60 requests/minute per authenticated user (falls back to IP for
        // unauthenticated requests) via Laravel's built-in "api" limiter.
        // Login/register have their own tighter limiters (see
        // AppServiceProvider::boot()); this covers everything else.
        $middleware->throttleApi();

        // JSON API only, no Blade login view/route — without this, an
        // unauthenticated request without an explicit Accept: application/json
        // header 500s trying to redirect to a nonexistent "login" route
        // instead of returning 401.
        $middleware->redirectGuestsTo(fn () => null);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );
    })->create();
