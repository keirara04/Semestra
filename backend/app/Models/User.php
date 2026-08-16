<?php

namespace App\Models;

use App\Jobs\SendVerificationEmail;
use Database\Factories\UserFactory;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\URL;

#[Fillable(['name', 'email', 'password', 'timezone', 'max_study_hours_per_day', 'deep_work_windows', 'quiet_hours', 'grade_scale'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable implements MustVerifyEmail
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'deep_work_windows' => 'array',
            'quiet_hours' => 'array',
            'max_study_hours_per_day' => 'integer',
            'ai_syllabus_extraction_consent_at' => 'datetime',
        ];
    }

    public function tasks(): HasMany
    {
        return $this->hasMany(Task::class);
    }

    /**
     * Overrides MustVerifyEmail's default, which routes through Laravel's
     * Notification system — this codebase has its own Notification
     * Eloquent model (see App\Models\Notification) with unrelated
     * type/status/idempotency-key semantics, so piping verification
     * through Notification::send would blur two unrelated things that
     * happen to share a name. Dispatches through the same
     * Mailable+ShouldQueue job shape as SendNotificationEmail instead.
     * Mails `pending_email` when a change is in flight, otherwise the
     * account's current (still-unverified) address.
     */
    public function sendEmailVerificationNotification(): void
    {
        $target = $this->pending_email ?? $this->email;

        $url = URL::temporarySignedRoute(
            'email.verify',
            now()->addMinutes(60),
            ['user' => $this->id, 'hash' => sha1($target)],
        );

        SendVerificationEmail::dispatch($this->id, $target, $url);
    }
}
