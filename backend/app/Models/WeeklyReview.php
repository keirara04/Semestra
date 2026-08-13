<?php

namespace App\Models;

use App\Models\Concerns\BelongsToUser;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['week_start_date', 'planned_minutes', 'completed_minutes', 'cause_breakdown', 'next_week_risk'])]
class WeeklyReview extends Model
{
    use BelongsToUser, HasFactory;

    protected function casts(): array
    {
        return [
            'week_start_date' => 'date',
            'cause_breakdown' => 'array',
        ];
    }
}
