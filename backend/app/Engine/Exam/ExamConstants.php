<?php

namespace App\Engine\Exam;

/**
 * v1 defaults for exam mode, one file, not hardcoded per view. See "Exam
 * mode" in mdfile/semester-command-center.md: "confidence score maps Not
 * started/Learning/Comfortable/Confident to 0/0.33/0.66/1, and topic
 * weight defaults to equal unless the syllabus states otherwise." No
 * syllabus parsing exists, so weight is always equal in v1.
 */
final class ExamConstants
{
    /** @var array<string, float> */
    public const CONFIDENCE_SCORE = [
        'not_started' => 0.0,
        'learning' => 0.33,
        'comfortable' => 0.66,
        'confident' => 1.0,
    ];

    /**
     * Target study minutes per topic not yet at "confident", the basis
     * for the suggested-pace sentence.
     */
    public const MINUTES_PER_WEAK_TOPIC = 45;
}
