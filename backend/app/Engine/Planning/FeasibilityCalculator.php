<?php

namespace App\Engine\Planning;

/**
 * Pure PHP, no Eloquent, see "Planning engine boundary" in
 * mdfile/semester-command-center.md. Implements "Smart study planner"
 * pipeline steps 2-4: demand/slack, feasibility + latest-safe-start,
 * and reservation of mandatory (hard-deadline) work.
 *
 * Algorithm: earliest-deadline-first (EDF) greedy reservation. Mandatory
 * tasks (those with a due date) are processed strictly in due-date order;
 * each one reserves its remaining minutes from the earliest available
 * capacity first, decrementing a running day-capacity map before the next
 * task is checked. EDF is the provably optimal ordering for this kind of
 * single-resource deadline-feasibility problem: if EDF reports a task
 * infeasible, no other processing order could have made it feasible
 * either, so there's no "smarter" ordering being left on the table.
 *
 * v1 scope boundary: dependency ordering between tasks ("a dependent task
 * cannot start before its blocker finishes") is NOT enforced here; this
 * pass only checks capacity vs. deadlines. Dependency ordering is a
 * placement-time concern (Phase D), not a feasibility-time one, per the
 * spec's own separation of "Ranking" (dependencies constrain ordering)
 * from this feasibility pass.
 */
final class FeasibilityCalculator
{
    /**
     * @param  TaskDemandInput[]  $tasks
     * @param  array<string, int>  $capacityByDate  Date ("Y-m-d") =>
     *                                              available study minutes that day, e.g. from
     *                                              CapacityCalculator's recommended_study_minutes. Must cover
     *                                              every date from $today through the latest task due date.
     */
    public function calculate(array $tasks, array $capacityByDate, string $today): FeasibilityReport
    {
        $remaining = $capacityByDate;
        $results = [];

        $mandatory = array_values(array_filter($tasks, fn (TaskDemandInput $task) => $task->dueDate !== null));
        usort($mandatory, fn (TaskDemandInput $a, TaskDemandInput $b) => $a->dueDate <=> $b->dueDate ?: $a->id <=> $b->id);

        foreach ($mandatory as $task) {
            $datesInWindow = $this->datesInWindow($remaining, $today, $task->dueDate);
            $totalAvailable = array_sum(array_map(fn ($date) => $remaining[$date], $datesInWindow));

            if ($totalAvailable < $task->remainingMinutes) {
                $results[] = new TaskFeasibility(
                    $task->id,
                    feasible: false,
                    recommendedStart: null,
                    latestSafeStart: null,
                    deficitMinutes: $task->remainingMinutes - $totalAvailable,
                );

                continue; // Nothing reserved; never invent a schedule for infeasible work.
            }

            $recommendedStart = $this->earliestDateWithCapacity($remaining, $datesInWindow);
            $latestSafeStart = $this->latestSafeStart($remaining, $datesInWindow, $task->remainingMinutes);

            $this->reserve($remaining, $datesInWindow, $task->remainingMinutes);

            $results[] = new TaskFeasibility(
                $task->id,
                feasible: true,
                recommendedStart: $recommendedStart,
                latestSafeStart: $latestSafeStart,
                deficitMinutes: 0,
            );
        }

        return new FeasibilityReport($results, $remaining);
    }

    /**
     * @param  array<string, int>  $capacityByDate
     * @return string[]
     */
    private function datesInWindow(array $capacityByDate, string $today, string $dueDate): array
    {
        $dates = array_keys($capacityByDate);
        $dates = array_filter($dates, fn ($date) => $date >= $today && $date <= $dueDate);
        sort($dates);

        return array_values($dates);
    }

    /**
     * @param  array<string, int>  $remaining
     * @param  string[]  $datesInWindow
     */
    private function earliestDateWithCapacity(array $remaining, array $datesInWindow): ?string
    {
        foreach ($datesInWindow as $date) {
            if ($remaining[$date] > 0) {
                return $date;
            }
        }

        return $datesInWindow[0] ?? null;
    }

    /**
     * Scans backward from the due date, accumulating currently-remaining
     * capacity, until it covers the task's demand. The last date where
     * that threshold is first crossed is the latest date the task could
     * still start and finish on time.
     *
     * @param  array<string, int>  $remaining
     * @param  string[]  $datesInWindow
     */
    private function latestSafeStart(array $remaining, array $datesInWindow, int $remainingMinutes): ?string
    {
        $descending = array_reverse($datesInWindow);
        $accumulated = 0;

        foreach ($descending as $date) {
            $accumulated += $remaining[$date];
            if ($accumulated >= $remainingMinutes) {
                return $date;
            }
        }

        return $datesInWindow[0] ?? null;
    }

    /**
     * @param  array<string, int>  $remaining
     * @param  string[]  $datesInWindow
     */
    private function reserve(array &$remaining, array $datesInWindow, int $minutesToReserve): void
    {
        foreach ($datesInWindow as $date) {
            if ($minutesToReserve <= 0) {
                break;
            }

            $take = min($remaining[$date], $minutesToReserve);
            $remaining[$date] -= $take;
            $minutesToReserve -= $take;
        }
    }
}
