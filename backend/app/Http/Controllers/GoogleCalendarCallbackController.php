<?php

namespace App\Http\Controllers;

use App\Models\GoogleCalendarConnection;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Log;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\InvalidStateException;
use Symfony\Component\HttpFoundation\RedirectResponse;
use Throwable;

/**
 * Not behind auth:sanctum — see GoogleCalendarConnectController's
 * docblock for why (Sanctum's stateful auth won't recognize a redirect
 * coming from accounts.google.com). The user is identified from the
 * plain session value that controller stashed instead.
 */
class GoogleCalendarCallbackController extends Controller
{
    public function __invoke(Request $request): RedirectResponse
    {
        $frontendUrl = rtrim(env('FRONTEND_URL', 'http://localhost:3000'), '/');

        $userId = $request->session()->pull('google_calendar_connect_user_id');

        if ($userId === null) {
            // No matching /connect in this session — expired session, a
            // direct hit on this URL, or a replayed callback. Nothing to
            // attach the tokens to.
            return redirect("{$frontendUrl}/settings?google_calendar=denied");
        }

        if ($request->get('error')) {
            // User declined consent, or Google bounced them — not a bug,
            // just report back to Settings rather than a raw error page.
            return redirect("{$frontendUrl}/settings?google_calendar=denied");
        }

        // Stateful (default), matching GoogleCalendarConnectController — both
        // legs of the flow go through this app's own session, so Socialite's
        // state-param CSRF check applies normally rather than being disabled.
        //
        // Caught broadly, not just InvalidStateException: an expired code
        // (waited too long on Google's consent screen), a replayed
        // callback (back button + refresh), or any Guzzle/OAuth hiccup
        // should land the student back on Settings with a message, not a
        // raw 500 stack trace — every other failure path in this
        // controller already does that, this is the one that didn't.
        try {
            $googleUser = Socialite::driver('google')
                ->scopes(['https://www.googleapis.com/auth/calendar.events'])
                ->user();
        } catch (InvalidStateException $e) {
            return redirect("{$frontendUrl}/settings?google_calendar=denied");
        } catch (Throwable $e) {
            Log::warning('GoogleCalendarCallbackController: token exchange failed', ['error' => $e->getMessage()]);

            return redirect("{$frontendUrl}/settings?google_calendar=error");
        }

        // No refresh_token means Google didn't grant one this round (e.g.
        // GoogleCalendarConnectController's prompt=consent got skipped
        // somehow) — nothing durable to store, so surface that instead of
        // silently keeping a connection that will die at first token expiry.
        if (! $googleUser->refreshToken) {
            return redirect("{$frontendUrl}/settings?google_calendar=no_refresh_token");
        }

        GoogleCalendarConnection::updateOrCreate(
            ['user_id' => $userId],
            [
                'access_token' => $googleUser->token,
                'refresh_token' => $googleUser->refreshToken,
                'expires_at' => Carbon::now()->addSeconds($googleUser->expiresIn ?? 3600),
                'sync_token' => null, // (re)connecting starts a fresh full sync
            ],
        );

        return redirect("{$frontendUrl}/settings?google_calendar=connected");
    }
}
