<?php

// Exam is today or has passed; no pace sentence makes sense.
return [
    'topic_confidences' => ['not_started'],
    'days_remaining' => 0,
    'expected' => [
        'readiness_percent' => 0.0,
        'target_minutes_remaining' => 45,
        'suggested_pace_minutes_per_day' => null,
    ],
];
