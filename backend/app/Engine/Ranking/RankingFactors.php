<?php

namespace App\Engine\Ranking;

final class RankingFactors
{
    public function __construct(
        public readonly float $urgency,
        public readonly float $academicImpact,
        public readonly float $effortRisk,
        public readonly float $staleness,
        public readonly float $revisionNeed,
    ) {}

    /**
     * @return array<string, float>
     */
    public function toArray(): array
    {
        return [
            'urgency' => $this->urgency,
            'academic_impact' => $this->academicImpact,
            'effort_risk' => $this->effortRisk,
            'staleness' => $this->staleness,
            'revision_need' => $this->revisionNeed,
        ];
    }
}
