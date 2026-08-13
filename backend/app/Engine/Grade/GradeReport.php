<?php

namespace App\Engine\Grade;

final class GradeReport
{
    /**
     * @param  PassHurdleResult[]  $passHurdles
     */
    public function __construct(
        public readonly ?float $currentStanding,
        public readonly float $completedWeight,
        public readonly float $totalWeight,
        public readonly bool $weightsNormalized,
        public readonly float $ungradedWeightPercent,
        public readonly ?float $bestCase,
        public readonly ?float $conservative,
        public readonly ?float $expected,
        public readonly ?float $neededAverage,
        public readonly array $passHurdles,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'current_standing' => $this->currentStanding,
            'completed_weight' => $this->completedWeight,
            'total_weight' => $this->totalWeight,
            'weights_normalized' => $this->weightsNormalized,
            'ungraded_weight_percent' => $this->ungradedWeightPercent,
            'best_case' => $this->bestCase,
            'conservative' => $this->conservative,
            'expected' => $this->expected,
            'needed_average' => $this->neededAverage,
            'pass_hurdles' => array_map(fn (PassHurdleResult $result) => $result->toArray(), $this->passHurdles),
        ];
    }
}
