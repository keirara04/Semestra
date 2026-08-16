<?php

namespace App\Http\Controllers;

use App\Models\GoogleCalendarConnection;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GoogleCalendarStatusController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $connection = GoogleCalendarConnection::where('user_id', $request->user()->id)->first();

        return response()->json([
            'connected' => $connection !== null,
            'lastSyncedAt' => $connection?->last_synced_at?->toIso8601String(),
        ]);
    }
}
