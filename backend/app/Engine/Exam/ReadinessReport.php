<?php

namespace App\Engine\Exam;

final class ReadinessReport
{
    /**
     * @param  float|null  $readinessPercent  Null when there are no linked topics — "unknown," not 0%.
     * @param  float|null  $suggestedPaceMinutesPerDay  Null when there's no time left (exam today/passed) or nothing left to study.
     */
    public function __construct(
        public readonly ?float $readinessPercent,
        public readonly int $targetMinutesRemaining,
        public readonly ?float $suggestedPaceMinutesPerDay,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'readiness_percent' => $this->readinessPercent,
            'target_minutes_remaining' => $this->targetMinutesRemaining,
            'suggested_pace_minutes_per_day' => $this->suggestedPaceMinutesPerDay,
        ];
    }
}
