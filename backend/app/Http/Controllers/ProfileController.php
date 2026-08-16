<?php

namespace App\Http\Controllers;

use App\Http\Requests\DeleteAccountRequest;
use App\Http\Requests\UpdateEmailRequest;
use App\Http\Requests\UpdatePasswordRequest;
use App\Http\Requests\UpdateProfileRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/**
 * Settings, see "Settings" in mdfile/DESIGN.md. Preferences (this
 * controller's `update`) cover the fields that actually exist and are
 * read by something (capacity/placement engines, grade tracker) plus
 * account identity (name). Email and password are deliberately separate
 * endpoints, not extra fields here: both require current-password
 * re-auth, which a single blanket `update()` would either have to
 * demand on every preference save (bad UX) or make conditional (a
 * classic place for auth bugs to hide). Email additionally never writes
 * `email` directly — see `updateEmail()`.
 */
class ProfileController extends Controller
{
    public function update(UpdateProfileRequest $request): JsonResponse
    {
        $user = $request->user();
        $user->update($request->validated());

        return response()->json($user);
    }

    /**
     * Writes `pending_email` only — the account's actual login identity
     * (`email`) and its verified status never change until the link
     * mailed to the new address is clicked (EmailVerificationController).
     * A typo here is a no-op the user can simply retry, never a lockout.
     */
    public function updateEmail(UpdateEmailRequest $request): JsonResponse
    {
        $user = $request->user();
        $user->pending_email = $request->validated('email');
        $user->save();
        $user->sendEmailVerificationNotification();

        return response()->json($user);
    }

    public function cancelPendingEmail(Request $request): JsonResponse
    {
        $user = $request->user();
        $user->pending_email = null;
        $user->save();

        return response()->json($user);
    }

    /**
     * The `hashed` cast on User::casts() hashes this on save — never call
     * Hash::make() here, that would hash an already-hashed value and
     * lock the account out permanently.
     */
    public function updatePassword(UpdatePasswordRequest $request): JsonResponse
    {
        $user = $request->user();
        $user->password = $request->validated('password');
        // Login uses Auth::attempt(..., true) (remember-me). Without
        // cycling this, a stolen remember-me cookie survives a password
        // change. The current tab's session is left alone on purpose so
        // changing your own password doesn't log you out.
        $user->remember_token = Str::random(60);
        $user->save();

        return response()->json($user);
    }

    public function destroy(DeleteAccountRequest $request): JsonResponse
    {
        // No explicit logout/session-invalidation needed: session auth
        // resolves the user by id on each request, so once the row is
        // gone, the next request is unauthenticated on its own.
        $request->user()->delete();

        return response()->json(status: 204);
    }
}
