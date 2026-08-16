<?php

namespace App\Jobs;

use App\Mail\NotificationMail;
use App\Models\Notification;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Mail;

/**
 * Delivery only — Notification rows are created (with their idempotency
 * key already locked in) by NotificationGenerator before this ever runs,
 * so a retry here re-sends mail, never re-decides whether to notify.
 */
class SendNotificationEmail implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public function __construct(public int $notificationId) {}

    public function handle(): void
    {
        $notification = Notification::withoutGlobalScopes()->with('user')->find($this->notificationId);

        if (! $notification || $notification->status === 'sent') {
            return;
        }

        // Sending reminder mail to an address nobody's confirmed is how
        // this domain's sender reputation gets bounce-listed — this is
        // the only place the app mails a user on its own schedule
        // (everything else is a direct response to something they did).
        if (! $notification->user->hasVerifiedEmail()) {
            $notification->update(['status' => 'skipped']);

            return;
        }

        try {
            Mail::to($notification->user->email)->send(new NotificationMail($notification));
            $notification->update(['status' => 'sent', 'sent_at' => now()]);
        } catch (\Throwable $e) {
            $notification->update(['status' => 'failed']);
            throw $e;
        }
    }
}
