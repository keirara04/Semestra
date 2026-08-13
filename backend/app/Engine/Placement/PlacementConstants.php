<?php

namespace App\Engine\Placement;

/**
 * v1 defaults for placement rules — one file, not hardcoded per view. See
 * "Placement" in mdfile/semester-command-center.md: "Minimum viable block
 * length per task" and "Maximum splits per task (configurable)".
 */
final class PlacementConstants
{
    public const MIN_BLOCK_MINUTES = 30;

    public const MAX_SPLITS_PER_TASK = 3;

    /** Used when the student hasn't set a deep-work window preference. */
    public const DEFAULT_DAY_START_TIME = '09:00';
}
