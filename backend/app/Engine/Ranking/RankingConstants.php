<?php

namespace App\Engine\Ranking;

/**
 * Every clamp range, default, and missing-data fallback for the ranking
 * formula lives here — one file, not hardcoded per view. See "Ranking" in
 * mdfile/semester-command-center.md: "Start with these fixed weights. Do
 * not begin with a log-based or otherwise mathematically clever formula
 * unless real acceptance/completion data proves it schedules better."
 */
final class RankingConstants
{
    public const WEIGHT_URGENCY = 0.40;

    public const WEIGHT_ACADEMIC_IMPACT = 0.20;

    public const WEIGHT_EFFORT_RISK = 0.15;

    public const WEIGHT_STALENESS = 0.15;

    public const WEIGHT_REVISION_NEED = 0.10;

    /** Missing due date → flexible task, fixed low urgency, never zero. */
    public const URGENCY_DEFAULT_NO_DUE_DATE = 10.0;

    /** Non-graded work (e.g. plain reading) — fixed baseline, not zero. */
    public const ACADEMIC_IMPACT_DEFAULT_NON_GRADED = 20.0;

    /**
     * effort_risk blends estimate size (minutes, scaled against this
     * "large" reference) with estimate_confidence.
     */
    public const EFFORT_RISK_SIZE_REFERENCE_MINUTES = 240;

    /** @var array<string, float> */
    public const EFFORT_RISK_CONFIDENCE_SCORE = [
        'low' => 80.0,
        'medium' => 50.0,
        'high' => 20.0,
    ];

    public const EFFORT_RISK_CONFIDENCE_DEFAULT = 50.0;

    /** No due date → a fixed runway assumption for the staleness ratio. */
    public const STALENESS_DEFAULT_RUNWAY_DAYS = 14;

    /** revision_need: lower confidence -> higher need. */
    public const REVISION_CONFIDENCE_SCORE = [
        'not_started' => 100.0,
        'learning' => 66.0,
        'comfortable' => 33.0,
        'confident' => 10.0,
    ];

    public const REVISION_CONFIDENCE_DEFAULT = 66.0;

    /** Days since last review scaled against this reference for the recency half of revision_need. */
    public const REVISION_RECENCY_REFERENCE_DAYS = 14;

    public static function clamp(float $value): float
    {
        return max(0.0, min(100.0, $value));
    }
}
