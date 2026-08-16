<?php

namespace App\Http\Controllers;

use App\Models\AcademicCalendarException;
use App\Models\ClassSession;
use App\Models\Commitment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

/**
 * Expands ClassSession and Commitment's weekly-pattern-plus-exceptions
 * recurrence (see ClassSession's migration docblock — deliberately not
 * RRULE) into virtual per-date occurrences for a date range, so the
 * calendar page can render the class timetable and recurring commitments
 * alongside CalendarBlocks. Same expansion rules CapacityCalculator uses
 * for the day-level minute totals, just emitting one row per occurrence
 * instead of a sum — read-only, nothing persisted, mirroring how these
 * two models already only fed capacity math before this endpoint existed.
 */
class CalendarOccurrencesController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'from' => ['required', 'date'],
            'to' => ['required', 'date'],
        ]);

        $from = Carbon::parse($validated['from'])->startOfDay();
        $to = Carbon::parse($validated['to'])->startOfDay();

        $breaks = AcademicCalendarException::all();
        $classSessions = ClassSession::with(['course', 'exceptions'])->get();
        $commitments = Commitment::all();

        $occurrences = [];
        $cursor = $from->copy();

        while ($cursor->lte($to)) {
            $date = $cursor->format('Y-m-d');
            $dayOfWeek = (int) $cursor->format('w');

            $isBreak = $breaks->contains(
                fn (AcademicCalendarException $break) => $date >= $break->start_date->format('Y-m-d')
                    && $date <= $break->end_date->format('Y-m-d'),
            );

            if (! $isBreak) {
                foreach ($classSessions as $session) {
                    if ((int) $session->day_of_week !== $dayOfWeek) {
                        continue;
                    }

                    $exception = $session->exceptions->first(
                        fn ($candidate) => $candidate->date->format('Y-m-d') === $date,
                    );

                    if ($exception?->type === 'cancelled') {
                        continue;
                    }

                    $startTime = $exception?->type === 'moved' ? $exception->new_start_time : $session->start_time;
                    $endTime = $exception?->type === 'moved' ? $exception->new_end_time : $session->end_time;
                    $location = $exception?->new_location ?? $session->location;

                    $occurrences[] = [
                        'source' => 'class_session',
                        'sourceId' => $session->id,
                        'date' => $date,
                        'startTime' => substr((string) $startTime, 0, 5),
                        'endTime' => substr((string) $endTime, 0, 5),
                        'title' => $session->course?->title ?? ucfirst($session->type),
                        'location' => $location,
                        'type' => $session->type,
                    ];
                }

                foreach ($commitments as $commitment) {
                    $applies = $commitment->date !== null
                        ? $commitment->date->format('Y-m-d') === $date
                        : (int) $commitment->day_of_week === $dayOfWeek;

                    if (! $applies) {
                        continue;
                    }

                    $occurrences[] = [
                        'source' => 'commitment',
                        'sourceId' => $commitment->id,
                        'date' => $date,
                        'startTime' => substr((string) $commitment->start_time, 0, 5),
                        'endTime' => substr((string) $commitment->end_time, 0, 5),
                        'title' => $commitment->title,
                        'location' => null,
                        'type' => $commitment->type,
                    ];
                }
            }

            $cursor->addDay();
        }

        return response()->json($occurrences);
    }
}
