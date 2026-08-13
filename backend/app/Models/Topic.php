<?php

namespace App\Models;

use App\Models\Concerns\BelongsToUser;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['course_id', 'title', 'confidence', 'review_stage', 'last_reviewed_at', 'next_review_at', 'missed_decay_applied_at'])]
class Topic extends Model
{
    use BelongsToUser, HasFactory;

    protected function casts(): array
    {
        return [
            'review_stage' => 'integer',
            'last_reviewed_at' => 'datetime',
            'next_review_at' => 'datetime',
            'missed_decay_applied_at' => 'datetime',
        ];
    }

    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }

    public function assessments(): BelongsToMany
    {
        return $this->belongsToMany(Assessment::class);
    }

    public function materials(): BelongsToMany
    {
        return $this->belongsToMany(Material::class, 'topic_material');
    }

    public function tasks(): HasMany
    {
        return $this->hasMany(Task::class);
    }
}
