<?php

namespace App\Models;

use App\Models\Concerns\BelongsToUser;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['course_id', 'type', 'day_of_week', 'start_time', 'end_time', 'location', 'description', 'remind_minutes_before', 'remind_recurring'])]
class ClassSession extends Model
{
    use BelongsToUser, HasFactory;

    protected function casts(): array
    {
        return [
            'day_of_week' => 'integer',
            'remind_minutes_before' => 'integer',
            'remind_recurring' => 'boolean',
        ];
    }

    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }

    public function exceptions(): HasMany
    {
        return $this->hasMany(ClassSessionException::class);
    }
}
