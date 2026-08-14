<?php

// Lectures + commitments exactly fill (and, on the second day, overlap
// past) 24 hours; available/recommended minutes must clamp at 0, never
// go negative.
return [
    'timezone' => 'UTC',
    'from' => '2026-05-04',
    'to' => '2026-05-05',
    'max_study_hours_per_day' => 6,
    'class_sessions' => [
        ['day_of_week' => 1, 'start_time' => '00:00', 'end_time' => '12:00', 'exceptions' => []],
    ],
    'commitments' => [
        ['day_of_week' => 1, 'date' => null, 'start_time' => '12:00', 'end_time' => '24:00'],
        // Two overlapping commitments deliberately sum past 24h; a real
        // double-booking must still clamp to 0, not go negative.
        ['day_of_week' => 2, 'date' => null, 'start_time' => '00:00', 'end_time' => '20:00'],
        ['day_of_week' => 2, 'date' => null, 'start_time' => '18:00', 'end_time' => '24:00'],
    ],
    'breaks' => [],
    'expected' => [
        '2026-05-04' => ['day_of_week' => 1, 'is_break' => false, 'lecture_minutes' => 720, 'commitment_minutes' => 720, 'available_minutes' => 0, 'recommended_study_minutes' => 0],
        '2026-05-05' => ['day_of_week' => 2, 'is_break' => false, 'lecture_minutes' => 0, 'commitment_minutes' => 1560, 'available_minutes' => 0, 'recommended_study_minutes' => 0],
    ],
];
