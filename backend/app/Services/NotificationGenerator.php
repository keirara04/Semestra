<?php

namespace App\Services;

use App\Engine\Capacity\CapacityCalculator;
use App\Engine\Exam\ReadinessCalculator;
use App\Engine\Planning\FeasibilityCalculator;
use App\Engine\Planning\TaskDemandInput;
use App\Http\Controllers\Concerns\BuildsCapacityInputs;
use App\Models\Assessment;
use App\Models\CalendarBlock;
use App\Models\Notification;
use App\Models\Task;
use App\Models\Topic;
use App\Models\User;
use DateTimeImmutable;
use DateTimeZone;
use Illuminate\Support\Carbon;

/**
 * Generates the notification examples from "Notifications" in
 * mdfile/semester-command-center.md — useful and configurable, never
 * motivational spam. Every notification carries an idempotency key so a
 * cron re-run can't double-send; each trigger below picks a key
 * granularity (daily/weekly) matched to how often that signal is
 * actually worth re-surfacing, not just "every run."
 */
class NotificationGenerator
{
    use BuildsCapacityInputs;

    private const EXAM_LOOKAHEAD_DAYS = 10;

    private const EXAM_READINESS_THRESHOLD = 70.0;

    private const TOPIC_UNREVIEWED_DAYS = 7;

    /**
     * @return Notification[] Newly created notifications (already-existing ones for today/this-week are skipped, not returned).
     */
    public function generate(User $user): array
    {
        $timezone = new DateTimeZone($user->timezone);
        $today = Carbon::now($timezone)->startOfDay();
        $horizon = $today->copy()->addDays(self::EXAM_LOOKAHEAD_DAYS);

        $days = app(CapacityCalculator::class)->calculate(
            $this->classSessionInputs(),
            $this->commitmentInputs(),
            $this->breakInputs(),
            $user->max_study_hours_per_day,
            $timezone,
            new DateTimeImmutable($today->format('Y-m-d'), $timezone),
            new DateTimeImmutable($horizon->format('Y-m-d'), $timezone),
        );
        $capacityByDate = [];
        foreach ($days as $day) {
            $capacityByDate[$day->date] = $day->recommendedStudyMinutes;
        }

        $created = [];
        $created = array_merge($created, $this->deficitToday($user, $capacityByDate, $today->format('Y-m-d')));
        $created = array_merge($created, $this->topicUnreviewed($user, $today));
        $created = array_merge($created, $this->tomorrowOverloaded($user, $capacityByDate, $today));
        $created = array_merge($created, $this->examWeakTopics($user, $today));

        return array_values(array_filter($created));
    }

    /**
     * @param  array<string, int>  $capacityByDate
     * @return Notification[]
     */
    private function deficitToday(User $user, array $capacityByDate, string $today): array
    {
        $openTasks = Task::with('assessment')->where('status', 'open')->get();
        $effectiveDueDate = fn (Task $task) => $task->due_at?->format('Y-m-d') ?? $task->assessment?->due_at?->format('Y-m-d');

        $demandInputs = $openTasks
            ->map(fn (Task $task) => new TaskDemandInput($task->id, $task->remaining_estimate_minutes ?? 0, $effectiveDueDate($task)))
            ->filter(fn (TaskDemandInput $task) => $task->dueDate !== null)
            ->values()
            ->all();

        if (count($demandInputs) === 0) {
            return [];
        }

        $feasibility = app(FeasibilityCalculator::class)->calculate($demandInputs, $capacityByDate, $today);
        $tasksById = $openTasks->keyBy('id');

        $deficitByAssessment = [];
        foreach ($feasibility->tasks as $taskResult) {
            if ($taskResult->feasible || $taskResult->deficitMinutes <= 0) {
                continue;
            }
            $task = $tasksById[$taskResult->taskId];
            $assessment = $task->assessment;
            if ($assessment === null) {
                continue;
            }
            $deficitByAssessment[$assessment->id] = ($deficitByAssessment[$assessment->id] ?? 0) + $taskResult->deficitMinutes;
        }

        $created = [];
        foreach ($deficitByAssessment as $assessmentId => $deficitMinutes) {
            $assessment = Assessment::find($assessmentId);
            $deficitHours = round($deficitMinutes / 60, 1);
            $created[] = $this->createIfNew($user, 'deficit_today', 'assessment', $assessmentId,
                "{$this->hash($user->id, 'deficit_today', $assessmentId, $today)}",
                "{$assessment->title} is at risk: about {$deficitHours}h short of what's needed before the deadline.",
                ['deficit_minutes' => $deficitMinutes],
            );
        }

        return $created;
    }

    /**
     * @return Notification[]
     */
    private function topicUnreviewed(User $user, Carbon $today): array
    {
        $week = $today->format('oW'); // ISO year+week — once per topic per week.

        $topics = Topic::where(function ($query) use ($today) {
            $query->whereNull('last_reviewed_at')
                ->orWhere('last_reviewed_at', '<=', $today->copy()->subDays(self::TOPIC_UNREVIEWED_DAYS));
        })->get();

        $created = [];
        foreach ($topics as $topic) {
            $days = $topic->last_reviewed_at ? $topic->last_reviewed_at->diffInDays($today) : null;
            $daysText = $days !== null ? "{$days} days" : 'a while';

            $created[] = $this->createIfNew($user, 'topic_unreviewed', 'topic', $topic->id,
                $this->hash($user->id, 'topic_unreviewed', $topic->id, $week),
                "You have not reviewed {$topic->title} for {$daysText}.",
                ['days_since_review' => $days],
            );
        }

        return $created;
    }

    /**
     * @param  array<string, int>  $capacityByDate
     * @return Notification[]
     */
    private function tomorrowOverloaded(User $user, array $capacityByDate, Carbon $today): array
    {
        $tomorrow = $today->copy()->addDay();
        $tomorrowDate = $tomorrow->format('Y-m-d');
        $capacity = $capacityByDate[$tomorrowDate] ?? 0;

        if ($capacity <= 0) {
            return [];
        }

        $planned = CalendarBlock::whereIn('status', ['accepted', 'suggested', 'moved', 'done'])
            ->whereBetween('start_at', [$tomorrow, $tomorrow->copy()->endOfDay()])
            ->get()
            ->sum(fn (CalendarBlock $block) => $block->start_at->diffInMinutes($block->end_at));

        if ($planned <= $capacity) {
            return [];
        }

        $plannedHours = round($planned / 60, 1);

        return array_filter([$this->createIfNew($user, 'tomorrow_overloaded', null, null,
            $this->hash($user->id, 'tomorrow_overloaded', $tomorrowDate),
            "Tomorrow has {$plannedHours}h planned; consider moving one task.",
            ['planned_minutes' => $planned, 'capacity_minutes' => $capacity],
        )]);
    }

    /**
     * @return Notification[]
     */
    private function examWeakTopics(User $user, Carbon $today): array
    {
        $horizon = $today->copy()->addDays(self::EXAM_LOOKAHEAD_DAYS);

        $exams = Assessment::where('type', 'exam')
            ->whereBetween('due_at', [$today, $horizon])
            ->get();

        $created = [];
        foreach ($exams as $exam) {
            $topics = $exam->topics()->get(['topics.id', 'topics.title', 'topics.confidence']);
            if ($topics->isEmpty()) {
                continue;
            }

            $daysRemaining = (int) $today->diffInDays($exam->due_at, false);
            $report = app(ReadinessCalculator::class)->calculate($topics->pluck('confidence')->all(), max(0, $daysRemaining));

            if ($report->readinessPercent === null || $report->readinessPercent >= self::EXAM_READINESS_THRESHOLD) {
                continue;
            }

            $weakest = $topics->sortBy(fn ($topic) => match ($topic->confidence) {
                'not_started' => 0, 'learning' => 1, 'comfortable' => 2, default => 3,
            })->first();

            $created[] = $this->createIfNew($user, 'exam_weak_topics', 'assessment', $exam->id,
                $this->hash($user->id, 'exam_weak_topics', $exam->id, $today->format('Y-m-d')),
                "Your {$exam->title} is {$daysRemaining} days away; {$weakest->title} remains marked as shaky.",
                ['readiness_percent' => $report->readinessPercent],
            );
        }

        return array_filter($created);
    }

    private function createIfNew(User $user, string $type, ?string $subjectType, ?int $subjectId, string $idempotencyKey, string $message, array $payload): ?Notification
    {
        if (Notification::where('idempotency_key', $idempotencyKey)->exists()) {
            return null;
        }

        return Notification::create([
            'type' => $type,
            'subject_type' => $subjectType,
            'subject_id' => $subjectId,
            'idempotency_key' => $idempotencyKey,
            'message' => $message,
            'payload' => $payload,
        ]);
    }

    private function hash(int $userId, string $type, ?int $subjectId, string $bucket): string
    {
        return hash('sha256', implode('|', [$userId, $type, $subjectId ?? 'null', $bucket]));
    }
}
