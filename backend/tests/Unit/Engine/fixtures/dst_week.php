<?php

// DST week: America/New_York springs forward on Sunday 8 March 2026
// (23-hour day). The calculator works in whole calendar days and H:i
// clock times, never elapsed wall-clock duration, so lecture minutes on
// the DST day itself must come out identical to any other day.
return [
    'timezone' => 'America/New_York',
    'from' => '2026-03-06',
    'to' => '2026-03-10',
    'max_study_hours_per_day' => 6,
    'class_sessions' => [
        ['day_of_week' => 0, 'start_time' => '22:00', 'end_time' => '23:30', 'exceptions' => []],
    ],
    'commitments' => [],
    'breaks' => [],
    'expected' => [
        '2026-03-06' => ['day_of_week' => 5, 'is_break' => false, 'lecture_minutes' => 0, 'commitment_minutes' => 0, 'available_minutes' => 1440, 'recommended_study_minutes' => 360],
        '2026-03-07' => ['day_of_week' => 6, 'is_break' => false, 'lecture_minutes' => 0, 'commitment_minutes' => 0, 'available_minutes' => 1440, 'recommended_study_minutes' => 360],
        '2026-03-08' => ['day_of_week' => 0, 'is_break' => false, 'lecture_minutes' => 90, 'commitment_minutes' => 0, 'available_minutes' => 1350, 'recommended_study_minutes' => 360],
        '2026-03-09' => ['day_of_week' => 1, 'is_break' => false, 'lecture_minutes' => 0, 'commitment_minutes' => 0, 'available_minutes' => 1440, 'recommended_study_minutes' => 360],
        '2026-03-10' => ['day_of_week' => 2, 'is_break' => false, 'lecture_minutes' => 0, 'commitment_minutes' => 0, 'available_minutes' => 1440, 'recommended_study_minutes' => 360],
    ],
];
