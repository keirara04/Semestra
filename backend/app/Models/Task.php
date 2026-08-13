<?php

namespace App\Models;

use App\Models\Concerns\BelongsToUser;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'course_id', 'assessment_id', 'milestone_id', 'topic_id', 'depends_on_task_id',
    'title', 'estimated_minutes', 'remaining_estimate_minutes', 'priority', 'status', 'due_at',
    'actual_minutes_logged', 'completion_percent', 'estimate_confidence',
])]
class Task extends Model
{
    use BelongsToUser, HasFactory;

    protected function casts(): array
    {
        return [
            'due_at' => 'datetime',
        ];
    }

    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }

    public function assessment(): BelongsTo
    {
        return $this->belongsTo(Assessment::class);
    }

    public function milestone(): BelongsTo
    {
        return $this->belongsTo(Milestone::class);
    }

    public function dependsOnTask(): BelongsTo
    {
        return $this->belongsTo(Task::class, 'depends_on_task_id');
    }

    /**
     * True if setting $task's dependency to $dependsOnId would close a
     * cycle — walks the candidate's dependency chain looking for $task's
     * own id. Cycles are rejected at creation/update time, not discovered
     * later by the planner (see "Ranking" in the plan).
     */
    public static function wouldCreateCycle(?int $taskId, ?int $dependsOnId): bool
    {
        if ($dependsOnId === null) {
            return false;
        }

        if ($taskId !== null && $dependsOnId === $taskId) {
            return true;
        }

        $visited = [];
        $currentId = $dependsOnId;

        while ($currentId !== null) {
            if ($taskId !== null && $currentId === $taskId) {
                return true;
            }
            if (isset($visited[$currentId])) {
                break; // already-broken cycle elsewhere; not this task's problem
            }
            $visited[$currentId] = true;

            $currentId = static::withoutGlobalScopes()
                ->whereKey($currentId)
                ->value('depends_on_task_id');
        }

        return false;
    }
}
