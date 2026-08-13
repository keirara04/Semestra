<?php

namespace App\Engine\Planning;

final class TaskFeasibility
{
    public function __construct(
        public readonly int $taskId,
        public readonly bool $feasible,
        public readonly ?string $recommendedStart, // "Y-m-d"
        public readonly ?string $latestSafeStart, // "Y-m-d"
        public readonly int $deficitMinutes,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'task_id' => $this->taskId,
            'feasible' => $this->feasible,
            'recommended_start' => $this->recommendedStart,
            'latest_safe_start' => $this->latestSafeStart,
            'deficit_minutes' => $this->deficitMinutes,
        ];
    }
}
