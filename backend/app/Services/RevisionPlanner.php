<?php

namespace App\Services;

use App\Engine\Revision\RevisionConstants;
use App\Engine\Revision\RevisionScheduler;
use App\Engine\Revision\TopicReviewInput;
use App\Models\Task;
use App\Models\Topic;
use App\Models\User;
use Illuminate\Support\Carbon;

/**
 * Eloquent orchestration around the pure RevisionScheduler engine —
 * generates/maintains the Task rows a due review needs and applies
 * confidence decay, per "Materials, notes, and revision" in
 * mdfile/semester-command-center.md. Called at the start of every
 * PlanningRunner run so revision tasks exist before ranking/placement
 * sees them — "revision items ... enter the same ranking queue as
 * assessment tasks, not a separate silo."
 */
class RevisionPlanner
{
    public function plan(User $user, RevisionScheduler $scheduler): void
    {
        $today = Carbon::now($user->timezone)->format('Y-m-d');

        $topics = Topic::whereNotNull('next_review_at')->get();

        if ($topics->isEmpty()) {
            return;
        }

        $openTaskTopicIds = Task::where('status', 'open')
            ->whereNotNull('topic_id')
            ->pluck('topic_id')
            ->flip();

        $inputs = $topics->map(fn (Topic $topic) => new TopicReviewInput(
            $topic->id,
            $topic->confidence,
            $topic->review_stage,
            $topic->next_review_at->format('Y-m-d'),
            $openTaskTopicIds->has($topic->id),
            $topic->missed_decay_applied_at !== null,
        ))->values()->all();

        $actions = $scheduler->planReviews($inputs, $today);
        $topicsById = $topics->keyBy('id');

        foreach ($actions as $action) {
            $topic = $topicsById[$action->topicId];

            if ($action->action === 'generate') {
                Task::create([
                    'course_id' => $topic->course_id,
                    'topic_id' => $topic->id,
                    'title' => "Review: {$topic->title}",
                    'estimated_minutes' => RevisionConstants::REVIEW_MINUTES,
                    'remaining_estimate_minutes' => RevisionConstants::REVIEW_MINUTES,
                    'status' => 'open',
                    'due_at' => $action->dueDate,
                ]);
            }

            if ($action->decayConfidence) {
                $topic->update([
                    'confidence' => $action->newConfidence,
                    'missed_decay_applied_at' => now(),
                ]);
            }
        }
    }
}
