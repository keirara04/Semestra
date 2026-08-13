<?php

namespace App\Models;

use App\Models\Concerns\BelongsToUser;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['run_at', 'trigger', 'explanation_snapshot'])]
class StudyPlan extends Model
{
    use BelongsToUser, HasFactory;

    protected function casts(): array
    {
        return [
            'run_at' => 'datetime',
            'explanation_snapshot' => 'array',
        ];
    }

    public function calendarBlocks(): HasMany
    {
        return $this->hasMany(CalendarBlock::class);
    }
}
