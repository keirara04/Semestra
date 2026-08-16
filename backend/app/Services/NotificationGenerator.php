<?php

namespace App\Services;

use App\Engine\Capacity\CapacityCalculator;
use App\Engine\Exam\ReadinessCalculator;
use App\Engine\Planning\FeasibilityCalculator;
use App\Engine\Planning\TaskDemandInput;
use App\Http\Controllers\Concerns\BuildsCapacityInputs;
use App\Models\Assessment;
use App\Models\CalendarBlock;
use App\Models\ClassSession;
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
        $now = Carbon::now($timezone);
        $today = $now->copy()->startOfDay();
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
        $created = array_merge($created, $this->blockReminders($user, $now));
        $created = array_merge($created, $this->classSessionReminders($user, $now));

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
     * A student-set reminder on a CalendarBlock (any type — lecture,
     * commitment, or study). This command runs hourly, so the window
     * looks back two hours: wide enough that an hourly cron never misses
     * a `remind_at` that lands between two runs, but bounded so a block
     * whose reminder time is long past (the schedule was paused, e.g.)
     * doesn't fire a stale notification days later. One-shot, not
     * date-bucketed — the idempotency key is just the block id.
     *
     * @return Notification[]
     */
    private function blockReminders(User $user, Carbon $now): array
    {
        $due = CalendarBlock::whereNotNull('remind_at')
            ->where('remind_at', '<=', $now)
            ->where('remind_at', '>=', $now->copy()->subHours(2))
            ->where('status', '!=', 'skipped')
            ->get();

        $created = [];
        foreach ($due as $block) {
            $label = $block->title ?: ucfirst($block->type);
            $time = $block->start_at->copy()->setTimezone($user->timezone)->format('g:ia');

            $created[] = $this->createIfNew($user, 'block_reminder', 'calendar_block', $block->id,
                $this->hash($user->id, 'block_reminder', $block->id, 'once'),
                "Reminder: {$label} starts at {$time}.",
                ['block_id' => $block->id],
            );
        }

        return $created;
    }

    /**
     * A reminder on a recurring ClassSession (a course's lecture/tutorial/
     * lab/exam slot), distinct from blockReminders: a ClassSession has no
     * single start_at, it recurs every week on day_of_week, so "today"
     * this occurrence happens is recomputed each run rather than read off
     * a stored timestamp. Idempotency key includes today's date so each
     * week's occurrence gets its own notification, not just the first
     * one ever.
     *
     * @return Notification[]
     */
    private function classSessionReminders(User $user, Carbon $now): array
    {
        $todayDayOfWeek = (int) $now->format('w');

        $sessions = ClassSession::where('day_of_week', $todayDayOfWeek)
            ->whereNotNull('remind_minutes_before')
            ->with('course')
            ->get();

        $created = [];
        foreach ($sessions as $session) {
            $start = $now->copy()->setTimeFromTimeString((string) $session->start_time);
            $remindAt = $start->copy()->subMinutes($session->remind_minutes_before);

            if ($now->lt($remindAt) || $now->gt($remindAt->copy()->addHours(2))) {
                continue;
            }

            $label = $session->course?->title ?? ucfirst($session->type);

            $notification = $this->createIfNew($user, 'class_session_reminder', 'class_session', $session->id,
                $this->hash($user->id, 'class_session_reminder', $session->id, $now->format('Y-m-d')),
                "Reminder: {$label} starts at {$start->format('g:ia')}.",
                ['class_session_id' => $session->id],
            );

            // Recurring is opt-in, not assumed just because the class
            // itself repeats weekly — a plain "remind me about this"
            // fires once, for the next occurrence, then turns itself off.
            if ($notification !== null && ! $session->remind_recurring) {
                $session->update(['remind_minutes_before' => null]);
            }

            $created[] = $notification;
        }

        return $created;
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
