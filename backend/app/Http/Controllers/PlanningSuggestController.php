<?php

namespace App\Http\Controllers;

use App\Services\PlanningRunner;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Read-only counterpart to PlanningRunController: runs the same
 * capacity/ranking/placement pipeline via PlanningRunner::computePlan()
 * but writes nothing (no StudyPlan, no CalendarBlock rows). Backs the
 * calendar page's "Plan Suggestions" popup, which shows what to work on
 * and for how long per day without touching the calendar itself.
 *
 * Capped to a week out (see MAX_HORIZON_DAYS): this is a "what should I
 * do soon" preview, not the full multi-week placement run() does for the
 * real calendar.
 */
class PlanningSuggestController extends Controller
{
    private const MAX_HORIZON_DAYS = 7;

    public function __invoke(Request $request, PlanningRunner $runner): JsonResponse
    {
        $computed = $runner->computePlan($request->user(), maxHorizonDays: self::MAX_HORIZON_DAYS);
        $tasksById = $computed['tasksById'];

        $byDate = [];
        foreach ($computed['placementObjects'] as $result) {
            $task = $tasksById[$result->taskId];

            foreach ($result->blocks as $block) {
                $byDate[$block->date] ??= [
                    'date' => $block->date,
                    'totalMinutes' => 0,
                    'items' => [],
                ];

                $byDate[$block->date]['totalMinutes'] += $block->minutes;
                $byDate[$block->date]['items'][] = [
                    'taskId' => $task->id,
                    'title' => $task->title,
                    'courseId' => $task->course?->id,
                    'courseTitle' => $task->course?->title,
                    'minutes' => $block->minutes,
                    'startTime' => $block->startTime,
                    'endTime' => $block->endTime,
                ];
            }
        }

        ksort($byDate);

        return response()->json(['days' => array_values($byDate)]);
    }
}
