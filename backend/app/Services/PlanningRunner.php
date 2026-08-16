<?php

namespace App\Services;

use App\Engine\Capacity\CapacityCalculator;
use App\Engine\Placement\PlacementCalculator;
use App\Engine\Placement\PlacementConstants;
use App\Engine\Placement\TaskPlacementInput;
use App\Engine\Placement\TaskPlacementResult;
use App\Engine\Planning\FeasibilityCalculator;
use App\Engine\Planning\TaskDemandInput;
use App\Engine\Ranking\RankingCalculator;
use App\Engine\Ranking\TaskRankingInput;
use App\Engine\Revision\RevisionScheduler;
use App\Http\Controllers\Concerns\BuildsCapacityInputs;
use App\Models\CalendarBlock;
use App\Models\StudyPlan;
use App\Models\Task;
use App\Models\User;
use DateTimeImmutable;
use DateTimeZone;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Orchestrates the full "Smart study planner" pipeline (see
 * mdfile/semester-command-center.md) and persists its output — shared by
 * the on-demand HTTP endpoint (PlanningRunController) and the nightly
 * scheduled command, per "When it runs" in the plan: "On demand (student
 * requests a re-plan) and once nightly." Every run is versioned as a
 * StudyPlan with an explanation_snapshot, so "why did it suggest this
 * yesterday" stays answerable after the underlying data changes.
 *
 * Uses BuildsCapacityInputs (a controller trait) even though this class
 * isn't a controller — the trait's queries rely on Eloquent's
 * BelongsToUser global scope via Auth::user(), so callers (both the HTTP
 * controller and the console command) must have that user set on the
 * default auth guard before calling run().
 */
class PlanningRunner
{
    use BuildsCapacityInputs;

    public function run(User $user, string $trigger = 'on_demand'): array
    {
        $computed = $this->computePlan($user);

        if ($computed['tasksById']->isEmpty()) {
            return ['feasibility' => [], 'ranking' => [], 'placement' => [], 'created_blocks' => 0];
        }

        $timezone = $computed['timezone'];
        $tasksById = $computed['tasksById'];
        $placement = $computed['placementObjects'];
        $feasibilityArray = $computed['feasibility'];
        $rankingArray = $computed['ranking'];
        $placementArray = $computed['placement'];

        $createdCount = DB::transaction(function () use ($placement, $tasksById, $timezone, $trigger, $feasibilityArray, $rankingArray, $placementArray) {
            $plan = StudyPlan::create([
                'run_at' => now(),
                'trigger' => $trigger,
                'explanation_snapshot' => [
                    'feasibility' => $feasibilityArray,
                    'ranking' => $rankingArray,
                    'placement' => $placementArray,
                ],
            ]);

            CalendarBlock::where('status', 'suggested')->delete();

            $count = 0;
            foreach ($placement as $result) {
                $task = $tasksById[$result->taskId];
                foreach ($result->blocks as $block) {
                    CalendarBlock::create([
                        'study_plan_id' => $plan->id,
                        'task_id' => $task->id,
                        'type' => 'study',
                        'status' => 'suggested',
                        'title' => $task->title,
                        'start_at' => Carbon::parse("{$block->date} {$block->startTime}", $timezone),
                        'end_at' => Carbon::parse("{$block->date} {$block->endTime}", $timezone),
                    ]);
                    $count++;
                }
            }

            return $count;
        });

        return [
            'feasibility' => $feasibilityArray,
            'ranking' => $rankingArray,
            'placement' => $placementArray,
            'created_blocks' => $createdCount,
        ];
    }

    /**
     * Capacity → feasibility → ranking → placement, with no persistence.
     * Shared by run() (which persists the result as CalendarBlocks) and
     * PlanningSuggestController (which reads it for the "Plan Suggestions"
     * popup and writes nothing).
     *
     * @param  int|null  $maxHorizonDays  Caps how far past today the plan
     *                                    looks, regardless of task due dates
     *                                    (e.g. the suggestions popup only
     *                                    wants a week out). Null = the full
     *                                    horizon out to the furthest due date,
     *                                    what run() uses for the real nightly/
     *                                    on-demand placement.
     * @return array{
     *     timezone: DateTimeZone,
     *     tasksById: Collection<int, Task>,
     *     feasibility: array,
     *     ranking: array,
     *     placement: array,
     *     placementObjects: TaskPlacementResult[],
     * }
     */
    public function computePlan(User $user, ?int $maxHorizonDays = null): array
    {
        $timezone = new DateTimeZone($user->timezone);
        $today = Carbon::now($timezone)->format('Y-m-d');

        // Generate/maintain due revision tasks before the ranking queue is
        // built — "revision items ... enter the same ranking queue as
        // assessment tasks, not a separate silo."
        app(RevisionPlanner::class)->plan($user, app(RevisionScheduler::class));

        $openTasks = Task::with(['assessment.gradeItem', 'course', 'dependsOnTask', 'topic'])
            ->where('status', 'open')
            ->get();

        if ($openTasks->isEmpty()) {
            return [
                'timezone' => $timezone,
                'tasksById' => $openTasks->keyBy('id'),
                'feasibility' => [],
                'ranking' => [],
                'placement' => [],
                'placementObjects' => [],
            ];
        }

        $effectiveDueDate = fn (Task $task) => $task->due_at?->format('Y-m-d') ?? $task->assessment?->due_at?->format('Y-m-d');

        $dueDates = $openTasks->map($effectiveDueDate)->filter()->values();
        $horizon = $dueDates->isEmpty() ? $today : $dueDates->max();

        if ($maxHorizonDays !== null) {
            $cappedHorizon = Carbon::parse($today, $timezone)->addDays($maxHorizonDays)->format('Y-m-d');
            if ($cappedHorizon < $horizon) {
                $horizon = $cappedHorizon;
            }
        }

        $days = app(CapacityCalculator::class)->calculate(
            $this->classSessionInputs(),
            $this->commitmentInputs(),
            $this->breakInputs(),
            $user->max_study_hours_per_day,
            $timezone,
            new DateTimeImmutable($today, $timezone),
            new DateTimeImmutable($horizon, $timezone),
        );

        $committed = $this->committedMinutesByDate(new DateTimeImmutable($today, $timezone), new DateTimeImmutable($horizon, $timezone));

        $capacityByDate = [];
        foreach ($days as $day) {
            $capacityByDate[$day->date] = max(0, $day->recommendedStudyMinutes - ($committed[$day->date] ?? 0));
        }

        // Feasibility: informational only — see the class docblock in
        // PlanningRunController for why this doesn't feed Placement's pool.
        $mandatoryTasks = $openTasks
            ->map(fn (Task $task) => new TaskDemandInput($task->id, $task->remaining_estimate_minutes ?? 0, $effectiveDueDate($task)))
            ->filter(fn (TaskDemandInput $task) => $task->dueDate !== null)
            ->values()
            ->all();
        $feasibility = app(FeasibilityCalculator::class)->calculate($mandatoryTasks, $capacityByDate, $today);

        $rankingInputs = $openTasks->map(function (Task $task) use ($effectiveDueDate, $capacityByDate, $today) {
            $dueDate = $effectiveDueDate($task);
            $availableBeforeDue = $dueDate !== null
                ? array_sum(array_filter($capacityByDate, fn ($date) => $date >= $today && $date <= $dueDate, ARRAY_FILTER_USE_KEY))
                : null;

            return new TaskRankingInput(
                $task->id,
                $task->remaining_estimate_minutes ?? 0,
                $dueDate,
                $availableBeforeDue,
                $task->assessment?->gradeItem?->weighting !== null ? (float) $task->assessment->gradeItem->weighting : null,
                $task->estimate_confidence,
                $task->updated_at->format('Y-m-d'),
                $today,
                $task->topic?->confidence,
                $task->topic?->last_reviewed_at?->format('Y-m-d'),
            );
        })->all();

        $ranking = app(RankingCalculator::class)->rank($rankingInputs);

        $tasksById = $openTasks->keyBy('id');
        $placementInputs = array_map(function ($result) use ($tasksById) {
            $task = $tasksById[$result->taskId];

            return new TaskPlacementInput(
                $task->id,
                $task->remaining_estimate_minutes ?? 0,
                $task->depends_on_task_id,
                $task->dependsOnTask === null || $task->dependsOnTask->status === 'done',
            );
        }, $ranking);

        $dayStartTime = $this->deepWorkStartTime($user->deep_work_windows);
        $placement = app(PlacementCalculator::class)->place($placementInputs, $capacityByDate, $dayStartTime);

        return [
            'timezone' => $timezone,
            'tasksById' => $tasksById,
            'feasibility' => $feasibility->toArray(),
            'ranking' => array_map(fn ($result) => $result->toArray(), $ranking),
            'placement' => array_map(fn ($result) => $result->toArray(), $placement),
            'placementObjects' => $placement,
        ];
    }

    /**
     * @param  array<int, array<string, mixed>>|null  $deepWorkWindows
     */
    private function deepWorkStartTime(?array $deepWorkWindows): string
    {
        $start = $deepWorkWindows[0]['start'] ?? null;

        if (is_string($start) && preg_match('/^\d{2}:\d{2}$/', $start)) {
            return $start;
        }

        return PlacementConstants::DEFAULT_DAY_START_TIME;
    }
}
