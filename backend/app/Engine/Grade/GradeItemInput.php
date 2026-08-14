<?php

namespace App\Engine\Grade;

/**
 * Plain input value object, no Eloquent, same "Planning engine boundary"
 * rule as the capacity engine (see mdfile/semester-command-center.md).
 */
final class GradeItemInput
{
    public function __construct(
        public readonly int $id,
        public readonly string $name,
        public readonly float $weighting,
        public readonly float $maxScore,
        public readonly ?float $achievedScore,
        public readonly ?int $gradeCategoryId,
        public readonly ?float $passHurdlePercent,
    ) {}

    public function isGraded(): bool
    {
        return $this->achievedScore !== null;
    }

    /**
     * Achieved score as a percentage of max, or null if ungraded.
     */
    public function percent(): ?float
    {
        if ($this->achievedScore === null || $this->maxScore <= 0) {
            return null;
        }

        return ($this->achievedScore / $this->maxScore) * 100;
    }
}
