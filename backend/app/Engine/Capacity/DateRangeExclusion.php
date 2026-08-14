<?php

namespace App\Engine\Capacity;

/**
 * A term break / holiday (academic_calendar_exceptions). Capacity
 * calculations exclude these days entirely, see "Time, dates, and
 * recurrence" in the plan.
 */
final class DateRangeExclusion
{
    /**
     * @param  string  $startDate  "Y-m-d"
     * @param  string  $endDate  "Y-m-d"
     */
    public function __construct(
        public readonly string $startDate,
        public readonly string $endDate,
    ) {}

    public function covers(string $date): bool
    {
        return $date >= $this->startDate && $date <= $this->endDate;
    }
}
