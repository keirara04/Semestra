<?php

namespace App\Models;

use App\Models\Concerns\BelongsToUser;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['access_token', 'refresh_token', 'expires_at', 'google_calendar_id', 'sync_token', 'last_synced_at'])]
class GoogleCalendarConnection extends Model
{
    use BelongsToUser, HasFactory;

    protected function casts(): array
    {
        return [
            // App-key encryption at rest — see the migration docblock for
            // why this and not a separate secrets store.
            'access_token' => 'encrypted',
            'refresh_token' => 'encrypted',
            'expires_at' => 'datetime',
            'last_synced_at' => 'datetime',
        ];
    }

    public function isExpired(): bool
    {
        return $this->expires_at->isPast();
    }
}
