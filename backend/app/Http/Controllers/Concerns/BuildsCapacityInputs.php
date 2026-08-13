<?php

namespace App\Http\Controllers\Concerns;

use App\Engine\Capacity\ClassSessionExceptionInput;
use App\Engine\Capacity\ClassSessionInput;
use App\Engine\Capacity\CommitmentInput;
use App\Engine\Capacity\DateRangeExclusion;
use App\Models\AcademicCalendarException;
use App\Models\CalendarBlock;
use App\Models\ClassSession;
use App\Models\Commitment;
use DateTimeImmutable;

/**
 * Shared translation from the authenticated user's Eloquent rows into the
 * capacity engine's plain input objects — used by both
 * CalendarCapacityController and TodayController so the two never drift.
 */
trait BuildsCapacityInputs
{
    /**
     * @return ClassSessionInput[]
     */
    private function classSessionInputs(): array
    {
        return ClassSession::with('exceptions')->get()->map(
            fn (ClassSession $session) => new ClassSessionInput(
                $session->day_of_week,
                $session->start_time,
                $session->end_time,
                $session->exceptions->map(
                    fn ($exception) => new ClassSessionExceptionInput(
                        $exception->date->format('Y-m-d'),
                        $exception->type,
                        $exception->new_start_time,
                        $exception->new_end_time,
                    ),
                )->all(),
            ),
        )->all();
    }

    /**
     * @return CommitmentInput[]
     */
    private function commitmentInputs(): array
    {
        return Commitment::all()->map(
            fn (Commitment $commitment) => new CommitmentInput(
                $commitment->day_of_week,
                $commitment->date?->format('Y-m-d'),
                $commitment->start_time,
                $commitment->end_time,
            ),
        )->all();
    }

    /**
     * @return DateRangeExclusion[]
     */
    private function breakInputs(): array
    {
        return AcademicCalendarException::all()->map(
            fn (AcademicCalendarException $break) => new DateRangeExclusion(
                $break->start_date->format('Y-m-d'),
                $break->end_date->format('Y-m-d'),
            ),
        )->all();
    }

    /**
     * Accepted/done CalendarBlocks are committed capacity even before
     * they're completed — see "Placement" in
     * mdfile/semester-command-center.md ("Pinned blocks are never moved
     * ... counts as committed capacity even if not yet completed").
     * Feasibility, Ranking, and Placement all need this subtracted from
     * a day's raw capacity before they reason about what's still free.
     *
     * @return array<string, int> Date ("Y-m-d") => committed minutes.
     */
    private function committedMinutesByDate(DateTimeImmutable $from, DateTimeImmutable $to): array
    {
        $committed = [];

        // "moved" is a manual move, treated the same as pinned — see
        // "Manual calendar moves persist as intentional changes" in the plan.
        CalendarBlock::whereIn('status', ['accepted', 'done', 'moved'])
            ->whereBetween('start_at', [$from, $to->modify('+1 day')])
            ->get()
            ->each(function (CalendarBlock $block) use (&$committed) {
                $date = $block->start_at->format('Y-m-d');
                $minutes = $block->start_at->diffInMinutes($block->end_at);
                $committed[$date] = ($committed[$date] ?? 0) + $minutes;
            });

        return $committed;
    }
}
