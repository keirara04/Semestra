<?php

namespace App\Engine\Revision;

/**
 * Plain input value object, no Eloquent, same "Planning engine boundary"
 * rule as the other engines.
 */
final class TopicReviewInput
{
    /**
     * @param  int  $reviewStage  0 = never reviewed, up to count(INTERVAL_DAYS) = cycle complete.
     * @param  string|null  $nextReviewDueDate  "Y-m-d"; null means no review is scheduled (cycle complete or never started).
     */
    public function __construct(
        public readonly int $id,
        public readonly string $confidence,
        public readonly int $reviewStage,
        public readonly ?string $nextReviewDueDate,
        public readonly bool $hasOpenReviewTask,
        public readonly bool $alreadyDecayedForThisReview,
    ) {}
}
