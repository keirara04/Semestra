<?php

namespace App\Engine\Ranking;

final class RankingResult
{
    /**
     * @param  string[]  $reasons  Plain-language lines, see "Smart study
     *                             planner"'s "Suggested because:" example in the plan.
     */
    public function __construct(
        public readonly int $taskId,
        public readonly float $score,
        public readonly RankingFactors $factors,
        public readonly array $reasons,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'task_id' => $this->taskId,
            'score' => $this->score,
            'factors' => $this->factors->toArray(),
            'reasons' => $this->reasons,
        ];
    }
}
