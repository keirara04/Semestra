<?php

namespace App\Providers;

use App\Services\AI\AIProvider;
use App\Services\AI\OpenRouterProvider;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->bind(AIProvider::class, OpenRouterProvider::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Keyed by email+IP, not IP alone — an IP-only limit lets an
        // attacker credential-stuff a single victim account from many
        // IPs unthrottled, while an email-only limit lets one attacker
        // lock a victim out of their own login attempts.
        RateLimiter::for('login', function ($request) {
            return Limit::perMinute(5)->by(strtolower((string) $request->input('email')).'|'.$request->ip());
        });

        RateLimiter::for('register', function ($request) {
            return Limit::perMinute(5)->by($request->ip());
        });

        RateLimiter::for('api', function ($request) {
            return Limit::perMinute(60)->by($request->user()?->id ?: $request->ip());
        });
    }
}
