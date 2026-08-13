<?php

namespace App\Http\Controllers;

use App\Engine\Capacity\CapacityCalculator;
use App\Http\Controllers\Concerns\BuildsCapacityInputs;
use App\Models\Assessment;
use App\Models\CalendarBlock;
use App\Models\ClassSession;
use App\Models\Task;
use DateTimeImmutable;
use DateTimeZone;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

/**
 * Foundation Phase 5 — Today dashboard. No ranking engine yet (that's
 * Planning Engine): the task list here is plain due-date order, not the
 * real priority score from "Smart study planner". This honest limitation
 * is surfaced in the response (`ranking_is_basic: true`) so the frontend
 * copy can say so rather than look finished.
 */
class TodayController extends Controller
{
    use BuildsCapacityInputs;

    public function __invoke(Request $request, CapacityCalculator $calculator): JsonResponse
    {
        $user = $request->user();
        $timezone = new DateTimeZone($user->timezone);
        $today = Carbon::now($timezone)->startOfDay();
        $todayEnd = $today->copy()->endOfDay();
        $dayOfWeek = (int) $today->format('w');
        $dateString = $today->format('Y-m-d');

        $classesToday = ClassSession::with(['course', 'exceptions'])
            ->where('day_of_week', $dayOfWeek)
            ->get()
            ->map(function (ClassSession $session) use ($dateString) {
                $exception = $session->exceptions->firstWhere('date', $dateString);

                if ($exception?->type === 'cancelled') {
                    return null;
                }

                return [
                    'id' => $session->id,
                    'course_id' => $session->course_id,
                    'course_title' => $session->course->title,
                    'course_colour' => $session->course->colour,
                    'type' => $session->type,
                    'start_time' => $exception?->type === 'moved' ? $exception->new_start_time : $session->start_time,
                    'end_time' => $exception?->type === 'moved' ? $exception->new_end_time : $session->end_time,
                    'location' => $exception?->type === 'moved' ? $exception->new_location : $session->location,
                ];
            })
            ->filter()
            ->values();

        $assessmentsDueSoon = Assessment::with('course')
            ->where('status', '!=', 'done')
            ->whereBetween('due_at', [$today, $today->copy()->addDays(14)])
            ->orderBy('due_at')
            ->get()
            ->map(fn (Assessment $assessment) => [
                'id' => $assessment->id,
                'title' => $assessment->title,
                'due_at' => $assessment->due_at,
                'status' => $assessment->status,
                'course_title' => $assessment->course->title,
                'course_colour' => $assessment->course->colour,
            ]);

        $tasks = Task::with('course')
            ->where('status', 'open')
            ->orderByRaw('due_at IS NULL, due_at ASC')
            ->limit(10)
            ->get()
            ->map(fn (Task $task) => [
                'id' => $task->id,
                'title' => $task->title,
                'due_at' => $task->due_at,
                'estimated_minutes' => $task->estimated_minutes,
                'remaining_estimate_minutes' => $task->remaining_estimate_minutes,
                'course_title' => $task->course->title,
                'course_colour' => $task->course->colour,
            ]);

        $calendarBlocksToday = CalendarBlock::whereBetween('start_at', [$today, $todayEnd])
            ->orderBy('start_at')
            ->get();

        $plannedMinutesToday = $calendarBlocksToday
            ->whereIn('status', ['accepted', 'done'])
            ->sum(fn (CalendarBlock $block) => $block->start_at->diffInMinutes($block->end_at));

        $capacity = $calculator->calculate(
            $this->classSessionInputs(),
            $this->commitmentInputs(),
            $this->breakInputs(),
            $user->max_study_hours_per_day,
            $timezone,
            new DateTimeImmutable($dateString, $timezone),
            new DateTimeImmutable($dateString, $timezone),
        )[0];

        return response()->json([
            'date' => $dateString,
            'name' => $user->name,
            'classes_today' => $classesToday,
            'assessments_due_soon' => $assessmentsDueSoon,
            'tasks' => $tasks,
            'ranking_is_basic' => true,
            'calendar_blocks_today' => $calendarBlocksToday,
            'planned_minutes_today' => (int) $plannedMinutesToday,
            'capacity' => $capacity->toArray(),
        ]);
    }
}
