<?php

namespace App\Http\Controllers;

use App\Http\Requests\DeleteAccountRequest;
use App\Http\Requests\UpdateProfileRequest;
use Illuminate\Http\JsonResponse;

/**
 * Settings — see "Settings" in mdfile/DESIGN.md. Only the fields that
 * actually exist and are read by something (capacity/placement engines,
 * grade tracker) are editable here; Notifications' thresholds/channels
 * and Planning's safety-buffer/grade-influence slider aren't modeled yet
 * (Automation release), so there's nothing real to build settings for.
 */
class ProfileController extends Controller
{
    public function update(UpdateProfileRequest $request): JsonResponse
    {
        $user = $request->user();
        $user->update($request->validated());

        return response()->json($user);
    }

    public function destroy(DeleteAccountRequest $request): JsonResponse
    {
        // No explicit logout/session-invalidation needed — session auth
        // resolves the user by id on each request, so once the row is
        // gone, the next request is unauthenticated on its own.
        $request->user()->delete();

        return response()->json(status: 204);
    }
}
