<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Laravel\Socialite\Facades\Socialite;
use Symfony\Component\HttpFoundation\RedirectResponse;

/**
 * Kicks off the OAuth flow — a plain browser navigation (not a fetch),
 * so the frontend just points a link/window.location at this route
 * rather than calling it via apiFetch. `access_type=offline` +
 * `prompt=consent` are what make Google actually return a refresh_token;
 * without `prompt=consent`, a user who already granted access once
 * silently gets no refresh_token on a later re-auth.
 *
 * Stashes the authenticated user's id in the plain session before
 * redirecting: GoogleCalendarCallbackController can't rely on
 * auth:sanctum to identify the user when Google redirects back, because
 * Sanctum's stateful-cookie auth only activates when the request's
 * Referer/Origin matches SANCTUM_STATEFUL_DOMAINS — Google's redirect
 * arrives with Referer: accounts.google.com, not the frontend's origin,
 * so auth:sanctum would 401 it. This route itself is a direct browser
 * navigation from the frontend (Referer does match), so it still sits
 * behind auth:sanctum normally.
 */
class GoogleCalendarConnectController extends Controller
{
    public function __invoke(Request $request): RedirectResponse
    {
        $request->session()->put('google_calendar_connect_user_id', $request->user()->id);

        return Socialite::driver('google')
            ->scopes(['https://www.googleapis.com/auth/calendar.events'])
            ->with(['access_type' => 'offline', 'prompt' => 'consent'])
            ->redirect();
    }
}
