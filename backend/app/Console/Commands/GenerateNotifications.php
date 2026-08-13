<?php

namespace App\Console\Commands;

use App\Jobs\SendNotificationEmail;
use App\Models\Notification;
use App\Models\User;
use App\Services\NotificationGenerator;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;

/**
 * Runs hourly (see routes/console.php). Generates the idempotent
 * Notification rows for every user, then queues delivery — delayed past
 * quiet_hours.end when the moment of generation falls inside a user's
 * configured quiet window, so the row still exists immediately but the
 * email doesn't land at 2am.
 */
class GenerateNotifications extends Command
{
    protected $signature = 'notifications:generate';

    protected $description = 'Generate and queue delivery for due notifications, for every user';

    public function handle(NotificationGenerator $generator): int
    {
        $userIds = User::withoutGlobalScopes()->pluck('id');

        $total = 0;
        foreach ($userIds as $userId) {
            $user = User::find($userId);
            Auth::setUser($user);

            $created = $generator->generate($user);

            foreach ($created as $notification) {
                $this->dispatch($notification, $user);
                $total++;
            }
        }

        $this->info("Queued {$total} notification(s).");

        return self::SUCCESS;
    }

    private function dispatch(Notification $notification, User $user): void
    {
        $delayUntil = $this->quietHoursDelay($user);

        if ($delayUntil) {
            SendNotificationEmail::dispatch($notification->id)->delay($delayUntil);
        } else {
            SendNotificationEmail::dispatch($notification->id);
        }
    }

    private function quietHoursDelay(User $user): ?Carbon
    {
        $quietHours = $user->quiet_hours;
        if (! $quietHours || ! isset($quietHours['start'], $quietHours['end'])) {
            return null;
        }

        $timezone = $user->timezone;
        $now = Carbon::now($timezone);
        $start = Carbon::createFromFormat('H:i', $quietHours['start'], $timezone)->setDate($now->year, $now->month, $now->day)->setSeconds(0);
        $end = Carbon::createFromFormat('H:i', $quietHours['end'], $timezone)->setDate($now->year, $now->month, $now->day)->setSeconds(0);

        if ($end->lessThanOrEqualTo($start)) {
            // Overnight window (e.g. 22:00-07:00): "inside" spans midnight.
            if ($now->greaterThanOrEqualTo($start) || $now->lessThan($end)) {
                return $now->lessThan($start) ? $end : $end->copy()->addDay();
            }

            return null;
        }

        if ($now->between($start, $end)) {
            return $end;
        }

        return null;
    }
}
