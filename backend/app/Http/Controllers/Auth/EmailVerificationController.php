<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\RedirectResponse;

/**
 * The `{user}/{hash}` route sits outside auth:sanctum (see routes/api.php,
 * next to materials.stream) — a mail client opens this link with no
 * session, so the URL's own signature is the auth, not a cookie. `resend`
 * is the one action here that needs a session, and is throttled hard: it
 * sends mail to an address of the caller's choosing on demand.
 */
class EmailVerificationController extends Controller
{
    public function verify(Request $request, User $user, string $hash): RedirectResponse
    {
        $frontendUrl = rtrim(env('FRONTEND_URL', 'http://localhost:3000'), '/');

        $target = $user->pending_email ?? $user->email;

        // Binds the link to the address it was issued for — if
        // pending_email changed (a second email-change request) after
        // this link was mailed, the old link stops matching and dies
        // rather than silently confirming a stale address.
        if (! hash_equals(sha1($target), $hash)) {
            return redirect("{$frontendUrl}/settings?email=invalid");
        }

        if ($user->pending_email === null) {
            // Plain signup verification, or a repeat click — idempotent
            // either way.
            if ($user->email_verified_at === null) {
                $user->forceFill(['email_verified_at' => now()])->save();
            }

            return redirect("{$frontendUrl}/settings?email=verified");
        }

        // Email-change confirmation. Re-check uniqueness at promotion
        // time, not just when the change was requested — someone else
        // could have independently taken this address in the interim
        // (registered fresh with it, or completed their own change to
        // it), and the pending_email unique constraint alone can't catch
        // a collision against the live `email` column.
        $promoted = DB::transaction(function () use ($user) {
            $stillFree = ! User::withoutGlobalScopes()
                ->where('email', $user->pending_email)
                ->where('id', '!=', $user->id)
                ->exists();

            if (! $stillFree) {
                return false;
            }

            $user->forceFill([
                'email' => $user->pending_email,
                'pending_email' => null,
                'email_verified_at' => now(),
            ])->save();

            return true;
        });

        if (! $promoted) {
            return redirect("{$frontendUrl}/settings?email=taken");
        }

        return redirect("{$frontendUrl}/settings?email=verified");
    }

    public function resend(Request $request): JsonResponse|RedirectResponse
    {
        $user = $request->user();

        if ($user->pending_email === null && $user->hasVerifiedEmail()) {
            return response()->json(['message' => 'Nothing to verify.'], 422);
        }

        $user->sendEmailVerificationNotification();

        return response()->json(status: 204);
    }
}
