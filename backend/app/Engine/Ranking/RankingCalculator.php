<?php

namespace App\Engine\Ranking;

use DateTimeImmutable;

/**
 * Pure PHP, no Eloquent, see "Planning engine boundary" in
 * mdfile/semester-command-center.md. Implements "Ranking": a bounded,
 * clamped weighted sum (never multiplicative/log-additive, see the
 * plan's reasoning) deciding which *flexible* work gets the next open
 * slot. Does not decide whether mandatory work is scheduled at all;
 * that's the feasibility pass (RankingConstants/FeasibilityCalculator).
 *
 * v1 scope boundary: academic_impact uses the assessment's GradeItem
 * weighting directly as the impact proxy, not weighting × gap-to-target;
 * computing a live gap-to-target would mean re-running the grade tracker
 * per course on every ranking call. Documented simplification, not a bug.
 */
final class RankingCalculator
{
    /**
     * @param  TaskRankingInput[]  $tasks
     * @return RankingResult[] Sorted by score descending.
     */
    public function rank(array $tasks): array
    {
        $results = array_map(fn (TaskRankingInput $task) => $this->rankOne($task), $tasks);

        usort($results, fn (RankingResult $a, RankingResult $b) => $b->score <=> $a->score);

        return $results;
    }

    private function rankOne(TaskRankingInput $task): RankingResult
    {
        $urgency = $this->urgency($task);
        $academicImpact = $this->academicImpact($task);
        $effortRisk = $this->effortRisk($task);
        $staleness = $this->staleness($task);
        $revisionNeed = $this->revisionNeed($task);

        $factors = new RankingFactors($urgency, $academicImpact, $effortRisk, $staleness, $revisionNeed);

        $score = RankingConstants::clamp(
            $urgency * RankingConstants::WEIGHT_URGENCY
            + $academicImpact * RankingConstants::WEIGHT_ACADEMIC_IMPACT
            + $effortRisk * RankingConstants::WEIGHT_EFFORT_RISK
            + $staleness * RankingConstants::WEIGHT_STALENESS
            + $revisionNeed * RankingConstants::WEIGHT_REVISION_NEED,
        );

        return new RankingResult($task->id, $score, $factors, $this->reasons($task, $factors));
    }

    private function urgency(TaskRankingInput $task): float
    {
        if ($task->dueDate === null) {
            return RankingConstants::URGENCY_DEFAULT_NO_DUE_DATE;
        }

        if ($task->availableMinutesBeforeDue === null || $task->availableMinutesBeforeDue <= 0) {
            return 100.0;
        }

        return RankingConstants::clamp(($task->remainingMinutes / $task->availableMinutesBeforeDue) * 100);
    }

    private function academicImpact(TaskRankingInput $task): float
    {
        if ($task->gradeWeight === null) {
            return RankingConstants::ACADEMIC_IMPACT_DEFAULT_NON_GRADED;
        }

        return RankingConstants::clamp($task->gradeWeight);
    }

    private function effortRisk(TaskRankingInput $task): float
    {
        $sizeScore = RankingConstants::clamp(
            ($task->remainingMinutes / RankingConstants::EFFORT_RISK_SIZE_REFERENCE_MINUTES) * 100,
        );

        $confidenceScore = $task->estimateConfidence !== null
            ? (RankingConstants::EFFORT_RISK_CONFIDENCE_SCORE[$task->estimateConfidence] ?? RankingConstants::EFFORT_RISK_CONFIDENCE_DEFAULT)
            : RankingConstants::EFFORT_RISK_CONFIDENCE_DEFAULT;

        return RankingConstants::clamp(($sizeScore + $confidenceScore) / 2);
    }

    private function staleness(TaskRankingInput $task): float
    {
        $now = new DateTimeImmutable($task->now);
        $lastTouched = new DateTimeImmutable($task->lastTouchedAt);
        $daysSinceTouched = max(0, $now->diff($lastTouched)->days);

        $runwayDays = $task->dueDate !== null
            ? max(1, $now->diff(new DateTimeImmutable($task->dueDate))->days)
            : RankingConstants::STALENESS_DEFAULT_RUNWAY_DAYS;

        return RankingConstants::clamp(($daysSinceTouched / $runwayDays) * 100);
    }

    private function revisionNeed(TaskRankingInput $task): float
    {
        if ($task->topicConfidence === null) {
            return 0.0;
        }

        $confidenceScore = RankingConstants::REVISION_CONFIDENCE_SCORE[$task->topicConfidence]
            ?? RankingConstants::REVISION_CONFIDENCE_DEFAULT;

        if ($task->topicLastReviewedAt === null) {
            $recencyScore = 100.0;
        } else {
            $now = new DateTimeImmutable($task->now);
            $lastReviewed = new DateTimeImmutable($task->topicLastReviewedAt);
            $daysSinceReviewed = max(0, $now->diff($lastReviewed)->days);
            $recencyScore = RankingConstants::clamp(($daysSinceReviewed / RankingConstants::REVISION_RECENCY_REFERENCE_DAYS) * 100);
        }

        return RankingConstants::clamp(($confidenceScore + $recencyScore) / 2);
    }

    /**
     * @return string[]
     */
    private function reasons(TaskRankingInput $task, RankingFactors $factors): array
    {
        $reasons = [];

        if ($factors->urgency >= 60 && $task->dueDate !== null) {
            $reasons[] = 'Due soon relative to remaining capacity: high urgency.';
        }

        if ($factors->academicImpact >= 60) {
            $reasons[] = 'Worth a large share of the course grade: high impact.';
        }

        if ($factors->effortRisk >= 60) {
            $reasons[] = 'Large or low-confidence estimate: worth starting early.';
        }

        if ($factors->staleness >= 60) {
            $reasons[] = 'Not worked on in a while relative to time left: rising staleness.';
        }

        if ($factors->revisionNeed >= 60) {
            $reasons[] = 'Confidence is low and it has been a while since review: due for revision.';
        }

        if (count($reasons) === 0) {
            $reasons[] = 'No single factor stands out: ranked on the balance of all four.';
        }

        return $reasons;
    }
}
