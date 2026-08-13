<?php

namespace App\Http\Controllers\Concerns;

use App\Engine\Capacity\ClassSessionExceptionInput;
use App\Engine\Capacity\ClassSessionInput;
use App\Engine\Capacity\CommitmentInput;
use App\Engine\Capacity\DateRangeExclusion;
use App\Models\AcademicCalendarException;
use App\Models\ClassSession;
use App\Models\Commitment;

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
}
