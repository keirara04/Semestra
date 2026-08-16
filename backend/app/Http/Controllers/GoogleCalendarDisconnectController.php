<?php

namespace App\Http\Controllers;

use App\Models\CalendarBlock;
use App\Models\GoogleCalendarConnection;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GoogleCalendarDisconnectController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        // Pulled-in events (source: 'google') have no reason to exist once
        // there's nothing syncing them — they'd just sit stale forever.
        // Blocks this app created and merely pushed out (external_id set,
        // source null) are this app's own data — keep them, just drop the
        // now-dead external_id so a future edit doesn't try to push to a
        // connection that no longer exists.
        CalendarBlock::where('source', 'google')->delete();
        CalendarBlock::whereNotNull('external_id')->whereNull('source')->update(['external_id' => null]);

        GoogleCalendarConnection::where('user_id', $request->user()->id)->delete();

        return response()->json(status: 204);
    }
}
