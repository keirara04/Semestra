<?php

namespace App\Engine\Grade;

/**
 * Pure PHP, no Eloquent, see "Planning engine boundary" in
 * mdfile/semester-command-center.md. Implements "Grade and outcome
 * tracker"'s explicit v1 formulas.
 *
 * v1 simplifications, documented rather than hidden:
 * - "Conservative" uses this course's own unweighted average score per
 *   graded item (not a cross-course/cross-semester history, which
 *   doesn't exist yet, and not other students' scores; this is a
 *   single-user app, there is no "course average" pool to fall back to).
 * - Drop-lowest / best-N-of-M is evaluated dynamically against however
 *   many items in the category are graded so far, not held back until
 *   all M exist. A category with 3 of 10 labs graded and "best 8 of 10"
 *   set won't drop anything yet (3 < 8), and starts dropping once more
 *   than the kept count are graded.
 */
final class GradeCalculator
{
    /**
     * @param  GradeItemInput[]  $items
     * @param  GradeCategoryInput[]  $categories
     * @param  float|null  $targetPercent  Parsed from Course.grade_target; null if not a parseable percentage.
     */
    public function calculate(array $items, array $categories, ?float $targetPercent): GradeReport
    {
        $counted = $this->applyDropRules($items, $categories);

        $totalWeight = array_sum(array_map(fn (GradeItemInput $item) => $item->weighting, $counted));
        $completedWeight = array_sum(array_map(
            fn (GradeItemInput $item) => $item->weighting,
            array_filter($counted, fn (GradeItemInput $item) => $item->isGraded()),
        ));
        $completedSum = array_sum(array_map(
            fn (GradeItemInput $item) => $item->weighting * $item->percent(),
            array_filter($counted, fn (GradeItemInput $item) => $item->isGraded()),
        ));
        $remainingWeight = $totalWeight - $completedWeight;

        $currentStanding = $completedWeight > 0 ? $completedSum / $completedWeight : null;

        $gradedPercents = array_values(array_filter(array_map(
            fn (GradeItemInput $item) => $item->percent(),
            $counted,
        )));
        $historicalAverage = count($gradedPercents) > 0 ? array_sum($gradedPercents) / count($gradedPercents) : null;

        $bestCase = $this->project($totalWeight, $completedSum, $remainingWeight, 100.0);
        $conservative = $historicalAverage !== null
            ? $this->project($totalWeight, $completedSum, $remainingWeight, $historicalAverage)
            : null;
        $expected = $targetPercent !== null
            ? $this->project($totalWeight, $completedSum, $remainingWeight, $targetPercent)
            : null;

        $neededAverage = ($targetPercent !== null && $remainingWeight > 0)
            ? ($targetPercent * $totalWeight - $completedSum) / $remainingWeight
            : null;

        $passHurdles = array_values(array_map(
            fn (GradeItemInput $item) => new PassHurdleResult(
                $item->name,
                $item->passHurdlePercent,
                $item->percent(),
                $item->percent() !== null && $item->percent() >= $item->passHurdlePercent,
            ),
            array_filter($counted, fn (GradeItemInput $item) => $item->passHurdlePercent !== null),
        ));

        return new GradeReport(
            currentStanding: $currentStanding,
            completedWeight: $completedWeight,
            totalWeight: $totalWeight,
            weightsNormalized: abs($totalWeight - 100.0) > 0.01,
            ungradedWeightPercent: $totalWeight > 0 ? ($remainingWeight / $totalWeight) * 100 : 0.0,
            bestCase: $bestCase,
            conservative: $conservative,
            expected: $expected,
            neededAverage: $neededAverage,
            passHurdles: $passHurdles,
        );
    }

    private function project(float $totalWeight, float $completedSum, float $remainingWeight, float $assumedPercent): ?float
    {
        if ($totalWeight <= 0) {
            return null;
        }

        return ($completedSum + $remainingWeight * $assumedPercent) / $totalWeight;
    }

    /**
     * @param  GradeItemInput[]  $items
     * @param  GradeCategoryInput[]  $categories
     * @return GradeItemInput[]
     */
    private function applyDropRules(array $items, array $categories): array
    {
        $excludedIds = [];

        foreach ($categories as $category) {
            if ($category->bestN === null && $category->dropLowestCount === null) {
                continue;
            }

            $categoryItems = array_values(array_filter($items, fn (GradeItemInput $item) => $item->gradeCategoryId === $category->id));
            $graded = array_values(array_filter($categoryItems, fn (GradeItemInput $item) => $item->isGraded()));

            // dropCount stays 0 (nothing dropped yet) until enough items
            // are graded for the rule to mean anything, see the class
            // docblock's "dynamically" note.
            $dropCount = $category->bestN !== null
                ? max(0, count($graded) - $category->bestN)
                : (count($graded) > $category->dropLowestCount ? $category->dropLowestCount : 0);

            if ($dropCount <= 0) {
                continue;
            }

            usort($graded, fn (GradeItemInput $a, GradeItemInput $b) => $a->percent() <=> $b->percent());
            $toDrop = array_slice($graded, 0, $dropCount);

            foreach ($toDrop as $item) {
                $excludedIds[$item->id] = true;
            }
        }

        return array_values(array_filter($items, fn (GradeItemInput $item) => ! isset($excludedIds[$item->id])));
    }
}
