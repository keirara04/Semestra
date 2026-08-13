<?php

namespace App\Engine\Placement;

use DateTimeImmutable;

/**
 * Pure PHP, no Eloquent — see "Planning engine boundary" in
 * mdfile/semester-command-center.md. Implements "Placement": greedy fill
 * of ranked flexible work into whatever capacity the feasibility pass
 * (Phase B) did not already reserve.
 *
 * v1 scope boundary — clock-time fidelity: this places blocks using each
 * day's *aggregate remaining minutes*, not a true free-interval calendar
 * (the capacity engine outputs day totals, not a minute-by-minute busy/
 * free map). A day's placed minutes will never exceed what's actually
 * free, but the exact clock time of a suggested block is a nominal stack
 * from a single daily anchor (deep-work window start, or 09:00), not a
 * guaranteed non-overlap against a specific lecture's wall-clock time.
 * Every placed block starts as `status: suggested` — nothing commits
 * until the student accepts it, which is exactly the safety net this
 * simplification leans on. True interval-aware placement is future work,
 * not a silent gap.
 *
 * v1 scope boundary — dependencies: "a dependent task cannot be placed
 * into an earlier slot than its blocker" (see "Ranking" in the plan) is
 * enforced only when the blocker is either already done, or ranks higher
 * and gets placed earlier in this same run — the dependent's blocks are
 * then confined to dates after the blocker's last placed date. If the
 * blocker ranks *lower* (hasn't been processed yet when we reach the
 * dependent) or gets nothing placed, the dependent is skipped entirely
 * this run rather than reordering the ranked list — a future run will
 * place it once the blocker's own priority rises. Full topological
 * reordering is future work.
 */
final class PlacementCalculator
{
    /**
     * @param  TaskPlacementInput[]  $rankedTasks  Already in score-descending order.
     * @param  array<string, int>  $capacityByDate  Date ("Y-m-d") => free minutes (post-Phase-B reservation, post-committed-blocks subtraction).
     * @return TaskPlacementResult[]
     */
    public function place(array $rankedTasks, array $capacityByDate, string $dayStartTime = PlacementConstants::DEFAULT_DAY_START_TIME): array
    {
        $remaining = $capacityByDate;
        $dayCursorMinutes = array_fill_keys(array_keys($capacityByDate), 0);
        $dates = array_keys($capacityByDate);
        sort($dates);

        $lastPlacedDateByTaskId = [];
        $results = [];

        foreach ($rankedTasks as $task) {
            $minDate = null;

            if ($task->dependsOnTaskId !== null && ! $task->dependencyDone) {
                if (! isset($lastPlacedDateByTaskId[$task->dependsOnTaskId])) {
                    $results[] = new TaskPlacementResult($task->id, [], $task->remainingMinutes, skippedForDependency: true);

                    continue;
                }

                $minDate = $lastPlacedDateByTaskId[$task->dependsOnTaskId];
            }

            $blocks = [];
            $need = $task->remainingMinutes;
            $splits = 0;

            foreach ($dates as $date) {
                if ($need <= 0 || $splits >= PlacementConstants::MAX_SPLITS_PER_TASK) {
                    break;
                }

                if ($minDate !== null && $date <= $minDate) {
                    continue; // Strictly after the blocker's last placed date.
                }

                $blockMinutes = min($remaining[$date], $need);

                if ($blockMinutes < PlacementConstants::MIN_BLOCK_MINUTES) {
                    continue; // Too little left that day for a viable block.
                }

                $startTime = $this->addMinutes($dayStartTime, $dayCursorMinutes[$date]);
                $endTime = $this->addMinutes($startTime, $blockMinutes);

                $blocks[] = new PlacedBlock($date, $startTime, $endTime, $blockMinutes);

                $dayCursorMinutes[$date] += $blockMinutes;
                $remaining[$date] -= $blockMinutes;
                $need -= $blockMinutes;
                $splits++;
            }

            if (count($blocks) > 0) {
                $lastPlacedDateByTaskId[$task->id] = $blocks[count($blocks) - 1]->date;
            }

            $results[] = new TaskPlacementResult($task->id, $blocks, max(0, $need), skippedForDependency: false);
        }

        return $results;
    }

    private function addMinutes(string $time, int $minutes): string
    {
        $base = DateTimeImmutable::createFromFormat('H:i', $time);

        return $base->modify("+{$minutes} minutes")->format('H:i');
    }
}
