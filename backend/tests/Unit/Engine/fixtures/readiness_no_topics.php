<?php

// No linked topics; readiness is unknown, not 0%, same "distinguish
// unknown from zero" principle as the grade tracker.
return [
    'topic_confidences' => [],
    'days_remaining' => 5,
    'expected' => [
        'readiness_percent' => null,
        'target_minutes_remaining' => 0,
        'suggested_pace_minutes_per_day' => null,
    ],
];
