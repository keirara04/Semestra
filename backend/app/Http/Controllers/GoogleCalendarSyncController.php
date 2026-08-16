<?php

namespace App\Http\Controllers;

use App\Services\GoogleCalendarSyncer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * On-demand pull, for "sync now" right after connecting rather than
 * waiting up to 15 minutes for SyncGoogleCalendar's next scheduled run.
 */
class GoogleCalendarSyncController extends Controller
{
    public function __invoke(Request $request, GoogleCalendarSyncer $syncer): JsonResponse
    {
        $count = $syncer->pull($request->user());

        return response()->json(['synced' => $count]);
    }
}
