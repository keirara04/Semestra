<?php

namespace App\Engine\Capacity;

use DateInterval;
use DateTimeImmutable;
use DateTimeZone;

/**
 * Pure PHP, no Eloquent, see "Planning engine boundary" in the plan.
 * Expands weekly-pattern-plus-exceptions class sessions, commitments, and
 * term breaks into a DayCapacity per day. Every date/day-of-week
 * computation happens against the student's own timezone so a UTC-stored
 * timestamptz never silently shifts which calendar day a class falls on.
 */
final class CapacityCalculator
{
    /**
     * @param  ClassSessionInput[]  $classSessions
     * @param  CommitmentInput[]  $commitments
     * @param  DateRangeExclusion[]  $breaks
     * @return DayCapacity[]
     */
    public function calculate(
        array $classSessions,
        array $commitments,
        array $breaks,
        int $maxStudyHoursPerDay,
        DateTimeZone $timezone,
        DateTimeImmutable $from,
        DateTimeImmutable $to,
    ): array {
        $from = $from->setTimezone($timezone)->setTime(0, 0);
        $to = $to->setTimezone($timezone)->setTime(0, 0);
        $maxStudyMinutes = $maxStudyHoursPerDay * 60;

        $days = [];
        $cursor = $from;

        while ($cursor <= $to) {
            $date = $cursor->format('Y-m-d');
            $dayOfWeek = (int) $cursor->format('w');

            $isBreak = $this->isBreakDay($date, $breaks);

            if ($isBreak) {
                $days[] = new DayCapacity($date, $dayOfWeek, true, 0, 0, 0, 0);
                $cursor = $cursor->add(new DateInterval('P1D'));

                continue;
            }

            $lectureMinutes = $this->lectureMinutesFor($date, $dayOfWeek, $classSessions);
            $commitmentMinutes = $this->commitmentMinutesFor($date, $dayOfWeek, $commitments);

            // Clamp at 0, since overlapping/over-committed days must never
            // report negative available time (see "fully-booked day").
            $availableMinutes = max(0, 1440 - $lectureMinutes - $commitmentMinutes);
            $recommendedStudyMinutes = min($availableMinutes, $maxStudyMinutes);

            $days[] = new DayCapacity(
                $date,
                $dayOfWeek,
                false,
                $lectureMinutes,
                $commitmentMinutes,
                $availableMinutes,
                $recommendedStudyMinutes,
            );

            $cursor = $cursor->add(new DateInterval('P1D'));
        }

        return $days;
    }

    /**
     * @param  DateRangeExclusion[]  $breaks
     */
    private function isBreakDay(string $date, array $breaks): bool
    {
        foreach ($breaks as $break) {
            if ($break->covers($date)) {
                return true;
            }
        }

        return false;
    }

    /**
     * @param  ClassSessionInput[]  $classSessions
     */
    private function lectureMinutesFor(string $date, int $dayOfWeek, array $classSessions): int
    {
        $minutes = 0;

        foreach ($classSessions as $session) {
            if ($session->dayOfWeek !== $dayOfWeek) {
                continue;
            }

            $exception = $session->exceptionOn($date);

            if ($exception?->type === 'cancelled') {
                continue;
            }

            $start = $exception?->type === 'moved' ? $exception->newStartTime : $session->startTime;
            $end = $exception?->type === 'moved' ? $exception->newEndTime : $session->endTime;

            $minutes += $this->minutesBetween($start, $end);
        }

        return $minutes;
    }

    /**
     * @param  CommitmentInput[]  $commitments
     */
    private function commitmentMinutesFor(string $date, int $dayOfWeek, array $commitments): int
    {
        $minutes = 0;

        foreach ($commitments as $commitment) {
            if ($commitment->appliesOn($date, $dayOfWeek)) {
                $minutes += $this->minutesBetween($commitment->startTime, $commitment->endTime);
            }
        }

        return $minutes;
    }

    /**
     * Known v1 simplification: an overnight block (end <= start, e.g. a
     * 23:00-07:00 sleep commitment) has its full duration attributed to
     * its start day rather than split across the midnight boundary. Exact
     * per-calendar-day attribution of overnight blocks is deferred,
     * flagged here rather than silently returning a negative duration.
     */
    private function minutesBetween(string $start, string $end): int
    {
        [$startHour, $startMinute] = array_map('intval', explode(':', $start));
        [$endHour, $endMinute] = array_map('intval', explode(':', $end));

        $startTotal = $startHour * 60 + $startMinute;
        $endTotal = $endHour * 60 + $endMinute;

        return $endTotal > $startTotal ? $endTotal - $startTotal : (1440 - $startTotal) + $endTotal;
    }
}
