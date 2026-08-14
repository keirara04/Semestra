<?php

namespace App\Engine\Revision;

/**
 * v1 defaults for the spaced revision cadence, one file, not hardcoded
 * per view. See "Materials, notes, and revision" in
 * mdfile/semester-command-center.md.
 */
final class RevisionConstants
{
    /** Days after the previous review that the next one falls due. */
    public const INTERVAL_DAYS = [1, 3, 7];

    public const REVIEW_MINUTES = 15;

    /** Default daily review cap, configurable later via Settings. */
    public const DAILY_CAP_MINUTES = 45;

    /** @var string[] Lowest to highest. */
    public const CONFIDENCE_STEPS = ['not_started', 'learning', 'comfortable', 'confident'];

    public static function stepDown(string $confidence): string
    {
        $index = array_search($confidence, self::CONFIDENCE_STEPS, true);

        if ($index === false || $index === 0) {
            return $confidence;
        }

        return self::CONFIDENCE_STEPS[$index - 1];
    }
}
