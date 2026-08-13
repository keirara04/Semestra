<?php

namespace App\Models;

use App\Models\Concerns\BelongsToUser;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'calendar_block_id', 'planned_minutes', 'actual_minutes', 'status',
    'started_at', 'paused_at', 'paused_seconds_total', 'ended_at',
    'outcome', 'notes', 'blocker',
])]
class StudySession extends Model
{
    use BelongsToUser, HasFactory;

    protected function casts(): array
    {
        return [
            'started_at' => 'datetime',
            'paused_at' => 'datetime',
            'ended_at' => 'datetime',
        ];
    }

    public function calendarBlock(): BelongsTo
    {
        return $this->belongsTo(CalendarBlock::class);
    }
}
