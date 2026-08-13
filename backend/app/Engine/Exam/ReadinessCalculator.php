<?php

namespace App\Engine\Exam;

/**
 * Pure PHP, no Eloquent — see "Planning engine boundary" in
 * mdfile/semester-command-center.md. Implements "Exam mode"'s v1
 * readiness formula: confidence-weighted topic coverage, equal weight
 * per topic (no syllabus-declared weighting exists yet).
 */
final class ReadinessCalculator
{
    /**
     * @param  string[]  $topicConfidences  One entry per linked topic.
     * @param  int  $daysRemaining  Days until the exam; may be <= 0.
     */
    public function calculate(array $topicConfidences, int $daysRemaining): ReadinessReport
    {
        if (count($topicConfidences) === 0) {
            return new ReadinessReport(null, 0, null);
        }

        $scores = array_map(
            fn (string $confidence) => ExamConstants::CONFIDENCE_SCORE[$confidence] ?? 0.0,
            $topicConfidences,
        );

        $readinessPercent = (array_sum($scores) / count($scores)) * 100;

        $weakTopicCount = count(array_filter($topicConfidences, fn ($confidence) => $confidence !== 'confident'));
        $targetMinutesRemaining = $weakTopicCount * ExamConstants::MINUTES_PER_WEAK_TOPIC;

        $suggestedPace = ($daysRemaining > 0 && $targetMinutesRemaining > 0)
            ? $targetMinutesRemaining / $daysRemaining
            : null;

        return new ReadinessReport($readinessPercent, $targetMinutesRemaining, $suggestedPace);
    }
}
