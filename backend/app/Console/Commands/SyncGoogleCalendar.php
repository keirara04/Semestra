<?php

namespace App\Console\Commands;

use App\Models\GoogleCalendarConnection;
use App\Models\User;
use App\Services\GoogleCalendarSyncer;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Auth;
use Throwable;

/**
 * Polling fallback for pulling Google's changes in — there's no webhook
 * (Google push notification channel) wired up yet, that needs a public
 * HTTPS callback URL this local dev setup doesn't have. See "Real-time
 * updates" in the calendar roadmap plan. Every connected user, every run;
 * one user's broken/revoked connection is caught and logged rather than
 * aborting the rest of the batch, same instinct as RunNightlyPlanning.
 */
class SyncGoogleCalendar extends Command
{
    protected $signature = 'google-calendar:sync';

    protected $description = 'Pull Google Calendar changes for every connected user';

    public function handle(GoogleCalendarSyncer $syncer): int
    {
        $userIds = GoogleCalendarConnection::withoutGlobalScopes()->pluck('user_id');

        foreach ($userIds as $userId) {
            $user = User::find($userId);

            if ($user === null) {
                continue;
            }

            Auth::setUser($user);

            try {
                $count = $syncer->pull($user);
                $this->info("User {$user->id}: {$count} events synced.");
            } catch (Throwable $e) {
                $this->error("User {$user->id}: sync failed — {$e->getMessage()}");
            }
        }

        return self::SUCCESS;
    }
}
