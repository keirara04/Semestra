<?php

namespace App\Engine\Revision;

use DateTimeImmutable;

/**
 * Pure PHP, no Eloquent — see "Planning engine boundary" in
 * mdfile/semester-command-center.md. Implements "Materials, notes, and
 * revision"'s spaced cadence, daily cap, and backlog rule:
 *
 * - "A missed review is not duplicated onto the next day" — a topic with
 *   an already-open (undone) review task is never given a second one;
 *   the same task just stays overdue until completed.
 * - "Instead it merges into the next scheduled review for that topic" —
 *   achieved implicitly: the next stage's due date is always computed
 *   from the *actual* completion date (handled by the caller when a
 *   review task is completed), never from the original rigid schedule.
 *   A late review naturally reschedules forward with no separate merge
 *   step needed.
 * - "Confidence decays one step if more than one review is missed" — if
 *   a topic's open review has sat overdue for more than one full
 *   interval's worth of days, confidence decays once (guarded by
 *   $alreadyDecayedForThisReview so it doesn't re-decay every day it
 *   stays overdue).
 */
final class RevisionScheduler
{
    /**
     * @param  TopicReviewInput[]  $topics  Processed in array order — caller controls priority.
     * @return ReviewAction[]
     */
    public function planReviews(array $topics, string $today, int $dailyCapMinutes = RevisionConstants::DAILY_CAP_MINUTES): array
    {
        $remainingCapMinutes = $dailyCapMinutes;
        $actions = [];

        foreach ($topics as $topic) {
            if ($topic->nextReviewDueDate === null || $topic->nextReviewDueDate > $today) {
                $actions[] = new ReviewAction($topic->id, 'none', $topic->nextReviewDueDate, false, null);

                continue;
            }

            $overdueDays = $this->daysBetween($topic->nextReviewDueDate, $today);
            $intervalDays = RevisionConstants::INTERVAL_DAYS[$topic->reviewStage] ?? RevisionConstants::INTERVAL_DAYS[count(RevisionConstants::INTERVAL_DAYS) - 1];

            $decay = $overdueDays > $intervalDays && ! $topic->alreadyDecayedForThisReview;
            $newConfidence = $decay ? RevisionConstants::stepDown($topic->confidence) : null;

            if ($topic->hasOpenReviewTask) {
                $actions[] = new ReviewAction($topic->id, 'already_pending', $topic->nextReviewDueDate, $decay, $newConfidence);

                continue;
            }

            if ($remainingCapMinutes < RevisionConstants::REVIEW_MINUTES) {
                $actions[] = new ReviewAction($topic->id, 'capped', $topic->nextReviewDueDate, $decay, $newConfidence);

                continue;
            }

            $remainingCapMinutes -= RevisionConstants::REVIEW_MINUTES;
            $actions[] = new ReviewAction($topic->id, 'generate', $topic->nextReviewDueDate, $decay, $newConfidence);
        }

        return $actions;
    }

    /**
     * Assumes $to is on or after $from (only called once that's already
     * been verified by the caller above).
     */
    private function daysBetween(string $from, string $to): int
    {
        $fromDate = new DateTimeImmutable($from);
        $toDate = new DateTimeImmutable($to);

        return (int) $fromDate->diff($toDate)->format('%a');
    }
}
