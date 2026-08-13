<?php

namespace App\Engine\Planning;

final class FeasibilityReport
{
    /**
     * @param  TaskFeasibility[]  $tasks
     * @param  array<string, int>  $remainingCapacityByDate  Day capacity
     *                                                       left after reserving every feasible mandatory task's
     *                                                       minutes — this is what Placement (Phase D) fills next with
     *                                                       ranked flexible work. Infeasible tasks reserve nothing.
     */
    public function __construct(
        public readonly array $tasks,
        public readonly array $remainingCapacityByDate,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'tasks' => array_map(fn (TaskFeasibility $task) => $task->toArray(), $this->tasks),
            'remaining_capacity_by_date' => $this->remainingCapacityByDate,
        ];
    }
}
