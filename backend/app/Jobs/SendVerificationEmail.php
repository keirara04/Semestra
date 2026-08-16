<?php

namespace App\Jobs;

use App\Mail\VerifyEmailMail;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Mail;

/**
 * Takes the target address and the already-generated signed URL as
 * scalars, not the User model — a queued retry must mail the address
 * that was current when the link was signed, not whatever the user's
 * row says by the time the job actually runs (e.g. if they requested a
 * second email change in between).
 */
class SendVerificationEmail implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public function __construct(
        public int $userId,
        public string $targetEmail,
        public string $url,
    ) {}

    public function handle(): void
    {
        if (! User::withoutGlobalScopes()->whereKey($this->userId)->exists()) {
            return;
        }

        Mail::to($this->targetEmail)->send(new VerifyEmailMail($this->url));
    }
}
