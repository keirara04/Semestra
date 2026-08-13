<?php

namespace App\Engine\Ranking;

/**
 * Plain input value object — no Eloquent, same "Planning engine boundary"
 * rule as the other engines (see mdfile/semester-command-center.md).
 */
final class TaskRankingInput
{
    /**
     * @param  string|null  $dueDate  "Y-m-d". Null = flexible work.
     * @param  int|null  $availableMinutesBeforeDue  Remaining (post-Phase-B-reservation)
     *                                               capacity between now and $dueDate. Null when $dueDate is null.
     * @param  float|null  $gradeWeight  Parent assessment's GradeItem.weighting (0-100). Null if ungraded/no assessment.
     * @param  string|null  $estimateConfidence  "low"|"medium"|"high"|null.
     * @param  string  $lastTouchedAt  "Y-m-d" — proxy for last-updated.
     * @param  bool  $isRevisionLinked  Always false until Academic Intelligence ships RevisionItem/Topic.
     */
    public function __construct(
        public readonly int $id,
        public readonly int $remainingMinutes,
        public readonly ?string $dueDate,
        public readonly ?int $availableMinutesBeforeDue,
        public readonly ?float $gradeWeight,
        public readonly ?string $estimateConfidence,
        public readonly string $lastTouchedAt,
        public readonly string $now,
        public readonly bool $isRevisionLinked = false,
    ) {}
}
