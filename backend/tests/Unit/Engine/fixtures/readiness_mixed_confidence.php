<?php

// not_started(0) + learning(0.33) + comfortable(0.66) + confident(1) / 4 = 0.4975 -> 49.75%.
// 3 topics not yet "confident" * 45 min = 135 min target, over 9 days = 15 min/day.
return [
    'topic_confidences' => ['not_started', 'learning', 'comfortable', 'confident'],
    'days_remaining' => 9,
    'expected' => [
        'readiness_percent' => 49.75,
        'target_minutes_remaining' => 135,
        'suggested_pace_minutes_per_day' => 15.0,
    ],
];
