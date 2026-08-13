<?php

namespace App\Models;

use App\Models\Concerns\BelongsToUser;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['course_id', 'grade_category_id', 'name', 'weighting', 'max_score', 'achieved_score', 'pass_hurdle_percent'])]
class GradeItem extends Model
{
    use BelongsToUser, HasFactory;

    protected function casts(): array
    {
        return [
            'weighting' => 'decimal:2',
            'max_score' => 'decimal:2',
            'achieved_score' => 'decimal:2',
            'pass_hurdle_percent' => 'decimal:2',
        ];
    }

    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }

    public function gradeCategory(): BelongsTo
    {
        return $this->belongsTo(GradeCategory::class);
    }

    public function assessments(): HasMany
    {
        return $this->hasMany(Assessment::class);
    }
}
