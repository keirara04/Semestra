<?php

namespace App\Services;

use App\Engine\Capacity\CapacityCalculator;
use App\Engine\Planning\FeasibilityCalculator;
use App\Engine\Planning\TaskDemandInput;
use App\Engine\Ranking\RankingCalculator;
use App\Engine\Ranking\RankingResult;
use App\Engine\Ranking\TaskRankingInput;
use App\Http\Controllers\Concerns\BuildsCapacityInputs;
use App\Models\Task;
use App\Models\User;
use DateTimeImmutable;
use DateTimeZone;
use Illuminate\Support\Carbon;

/**
 * Read-only ranking preview — shared by PlanningRankingController (the
 * explicit preview endpoint) and TodayController (which needs a ranked
 * focus list without triggering a full planning run/write). See "Smart
 * study planner" in mdfile/semester-command-center.md.
 */
class RankingReader
{
    use BuildsCapacityInputs;

    /**
     * @return RankingResult[]
     */
    public function rank(User $user): array
    {
        $timezone = new DateTimeZone($user->timezone);
        $today = Carbon::now($timezone)->format('Y-m-d');

        $openTasks = Task::with('assessment.gradeItem')->where('status', 'open')->get();

        if ($openTasks->isEmpty()) {
            return [];
        }

        $effectiveDueDate = fn (Task $task) => $task->due_at?->format('Y-m-d') ?? $task->assessment?->due_at?->format('Y-m-d');
        $dueDates = $openTasks->map($effectiveDueDate)->filter()->values();
        $horizon = $dueDates->isEmpty() ? $today : $dueDates->max();

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

        $mandatoryTasks = $openTasks
            ->map(fn (Task $task) => new TaskDemandInput($task->id, $task->remaining_estimate_minutes ?? 0, $effectiveDueDate($task)))
            ->filter(fn (TaskDemandInput $task) => $task->dueDate !== null)
            ->values()
            ->all();
        $feasibility = app(FeasibilityCalculator::class)->calculate($mandatoryTasks, $capacityByDate, $today);
        $remainingByDate = $feasibility->remainingCapacityByDate;

        $rankingInputs = $openTasks->map(function (Task $task) use ($effectiveDueDate, $remainingByDate, $today) {
            $dueDate = $effectiveDueDate($task);
            $availableBeforeDue = $dueDate !== null
                ? array_sum(array_filter($remainingByDate, fn ($date) => $date >= $today && $date <= $dueDate, ARRAY_FILTER_USE_KEY))
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
                false,
            );
        })->all();

        return app(RankingCalculator::class)->rank($rankingInputs);
    }
}
