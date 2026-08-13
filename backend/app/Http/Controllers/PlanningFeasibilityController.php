<?php

namespace App\Http\Controllers;

use App\Engine\Capacity\CapacityCalculator;
use App\Engine\Planning\FeasibilityCalculator;
use App\Engine\Planning\TaskDemandInput;
use App\Http\Controllers\Concerns\BuildsCapacityInputs;
use App\Models\Task;
use DateTimeImmutable;
use DateTimeZone;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

/**
 * Thin controller — all the actual math lives in App\Engine\Planning and
 * App\Engine\Capacity (framework-agnostic, no Eloquent), per "Planning
 * engine boundary" in mdfile/semester-command-center.md. Implements
 * "Smart study planner" pipeline steps 1-4 end to end: capacity, demand,
 * feasibility, and reservation of mandatory work.
 */
class PlanningFeasibilityController extends Controller
{
    use BuildsCapacityInputs;

    public function __invoke(Request $request, CapacityCalculator $capacityCalculator, FeasibilityCalculator $feasibilityCalculator): JsonResponse
    {
        $user = $request->user();
        $timezone = new DateTimeZone($user->timezone);
        $today = Carbon::now($timezone)->format('Y-m-d');

        $tasks = Task::with('assessment')
            ->where('status', 'open')
            ->get()
            ->map(function (Task $task) {
                $dueDate = $task->due_at?->format('Y-m-d') ?? $task->assessment?->due_at?->format('Y-m-d');

                return new TaskDemandInput($task->id, $task->remaining_estimate_minutes ?? 0, $dueDate);
            })
            ->filter(fn (TaskDemandInput $task) => $task->dueDate !== null)
            ->values()
            ->all();

        if (count($tasks) === 0) {
            return response()->json(['tasks' => [], 'remaining_capacity_by_date' => []]);
        }

        $maxDueDate = max(array_map(fn (TaskDemandInput $task) => $task->dueDate, $tasks));

        $days = $capacityCalculator->calculate(
            $this->classSessionInputs(),
            $this->commitmentInputs(),
            $this->breakInputs(),
            $user->max_study_hours_per_day,
            $timezone,
            new DateTimeImmutable($today, $timezone),
            new DateTimeImmutable($maxDueDate, $timezone),
        );

        $committed = $this->committedMinutesByDate(new DateTimeImmutable($today, $timezone), new DateTimeImmutable($maxDueDate, $timezone));

        $capacityByDate = [];
        foreach ($days as $day) {
            $capacityByDate[$day->date] = max(0, $day->recommendedStudyMinutes - ($committed[$day->date] ?? 0));
        }

        $report = $feasibilityCalculator->calculate($tasks, $capacityByDate, $today);

        return response()->json($report->toArray());
    }
}
