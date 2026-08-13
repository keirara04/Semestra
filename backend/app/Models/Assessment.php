<?php

namespace App\Models;

use App\Models\Concerns\BelongsToUser;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'course_id', 'grade_item_id', 'type', 'title', 'due_at', 'status',
    'submission_url', 'estimated_minutes', 'group_members', 'links', 'notes',
])]
class Assessment extends Model
{
    use BelongsToUser, HasFactory;

    protected function casts(): array
    {
        return [
            'due_at' => 'datetime',
            'group_members' => 'array',
            'links' => 'array',
        ];
    }

    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }

    public function gradeItem(): BelongsTo
    {
        return $this->belongsTo(GradeItem::class);
    }

    public function milestones(): HasMany
    {
        return $this->hasMany(Milestone::class)->orderBy('order');
    }

    public function tasks(): HasMany
    {
        return $this->hasMany(Task::class);
    }

    public function submissions(): HasMany
    {
        return $this->hasMany(Submission::class);
    }

    public function materials(): BelongsToMany
    {
        return $this->belongsToMany(Material::class);
    }

    public function topics(): BelongsToMany
    {
        return $this->belongsToMany(Topic::class);
    }

    /**
     * Derived, never independently stored — sum of open Task
     * remaining_estimate_minutes. See "Core data model" in the plan.
     */
    protected function remainingMinutes(): Attribute
    {
        return Attribute::get(fn () => (int) $this->tasks()
            ->where('status', '!=', 'done')
            ->sum('remaining_estimate_minutes'));
    }
}
