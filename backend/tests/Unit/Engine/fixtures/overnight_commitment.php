<?php

// Overnight sleep block (23:00-07:00) — see CapacityCalculator::minutesBetween
// for the documented v1 simplification: full duration attributed to the
// start day, not split across the midnight boundary.
return [
    'timezone' => 'UTC',
    'from' => '2026-06-01',
    'to' => '2026-06-01',
    'max_study_hours_per_day' => 6,
    'class_sessions' => [],
    'commitments' => [
        ['day_of_week' => 1, 'date' => null, 'start_time' => '23:00', 'end_time' => '07:00'],
    ],
    'breaks' => [],
    'expected' => [
        '2026-06-01' => ['day_of_week' => 1, 'is_break' => false, 'lecture_minutes' => 0, 'commitment_minutes' => 480, 'available_minutes' => 960, 'recommended_study_minutes' => 360],
    ],
];
