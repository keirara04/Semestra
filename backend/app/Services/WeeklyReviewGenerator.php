<?php

namespace App\Services;

use App\Engine\Capacity\CapacityCalculator;
use App\Http\Controllers\Concerns\BuildsCapacityInputs;
use App\Models\CalendarBlock;
use App\Models\StudySession;
use App\Models\User;
use App\Models\WeeklyReview;
use App\Support\WeekState;
use DateTimeImmutable;
use DateTimeZone;
use Illuminate\Support\Carbon;

/**
 * "Weekly review" — see mdfile/semester-command-center.md: planned vs.
 * completed minutes for the week just finished, why the gap happened (the
 * outcome each study session was reflected with), and whether next week
 * is already shaping up overloaded.
 */
class WeeklyReviewGenerator
{
    use BuildsCapacityInputs;

    /**
     * @param  Carbon|null  $weekStart  Monday of the week to summarise. Defaults to the most recently completed week.
     */
    public function generate(User $user, ?Carbon $weekStart = null): WeeklyReview
    {
        $timezone = new DateTimeZone($user->timezone);
        $now = Carbon::now($timezone);
        $weekStart = ($weekStart ?? $now->copy()->startOfWeek(Carbon::MONDAY)->subWeek())->copy()->startOfDay();
        $weekEnd = $weekStart->copy()->addDays(7);

        $existing = WeeklyReview::where('week_start_date', $weekStart->format('Y-m-d'))->first();
        if ($existing) {
            return $existing;
        }

        $plannedMinutes = (int) CalendarBlock::whereIn('status', ['accepted', 'done', 'moved'])
            ->whereBetween('start_at', [$weekStart, $weekEnd])
            ->get()
            ->sum(fn (CalendarBlock $block) => $block->start_at->diffInMinutes($block->end_at));

        $sessions = StudySession::whereNotNull('ended_at')
            ->whereBetween('ended_at', [$weekStart, $weekEnd])
            ->get();

        $completedMinutes = (int) $sessions->sum('actual_minutes');

        $causeBreakdown = $sessions
            ->whereNotNull('outcome')
            ->where('outcome', '!=', 'completed')
            ->groupBy('outcome')
            ->map(fn ($group) => $group->count())
            ->all();

        $nextWeekRisk = $this->nextWeekRisk($user, $timezone, $weekEnd);

        return WeeklyReview::create([
            'week_start_date' => $weekStart->format('Y-m-d'),
            'planned_minutes' => $plannedMinutes,
            'completed_minutes' => $completedMinutes,
            'cause_breakdown' => $causeBreakdown,
            'next_week_risk' => $nextWeekRisk,
        ]);
    }

    private function nextWeekRisk(User $user, DateTimeZone $timezone, Carbon $nextWeekStart): string
    {
        $nextWeekEnd = $nextWeekStart->copy()->addDays(6);

        $days = app(CapacityCalculator::class)->calculate(
            $this->classSessionInputs(),
            $this->commitmentInputs(),
            $this->breakInputs(),
            $user->max_study_hours_per_day,
            $timezone,
            new DateTimeImmutable($nextWeekStart->format('Y-m-d'), $timezone),
            new DateTimeImmutable($nextWeekEnd->format('Y-m-d'), $timezone),
        );
        $capacity = array_sum(array_map(fn ($day) => $day->recommendedStudyMinutes, $days));

        $planned = (int) CalendarBlock::whereIn('status', ['accepted', 'suggested', 'moved', 'done'])
            ->whereBetween('start_at', [$nextWeekStart, $nextWeekEnd->copy()->addDay()])
            ->get()
            ->sum(fn (CalendarBlock $block) => $block->start_at->diffInMinutes($block->end_at));

        return WeekState::classify($planned, $capacity);
    }
}
