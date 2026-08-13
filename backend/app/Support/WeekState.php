<?php

namespace App\Support;

/**
 * Server-side mirror of frontend/src/components/WeekState.tsx — same
 * thresholds, so "next week's risk" in a weekly review always agrees with
 * what the Calendar/Today views would show once that week arrives.
 */
final class WeekState
{
    public static function classify(int $plannedMinutes, int $capacityMinutes): string
    {
        if ($plannedMinutes <= 0) {
            return 'comfortable';
        }

        $ratio = $capacityMinutes <= 0 ? INF : $plannedMinutes / $capacityMinutes;

        if ($ratio <= 0.7) {
            return 'comfortable';
        }
        if ($ratio <= 1.0) {
            return 'busy';
        }
        if ($ratio <= 1.3) {
            return 'at_risk';
        }

        return 'critical';
    }
}
