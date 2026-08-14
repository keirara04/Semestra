<?php

// A full week covered by an academic_calendar_exceptions break; class
// sessions are defined but must not count: capacity calculations exclude
// break periods entirely (see "Time, dates, and recurrence" in the plan).
return [
    'timezone' => 'UTC',
    'from' => '2026-04-06',
    'to' => '2026-04-10',
    'max_study_hours_per_day' => 6,
    'class_sessions' => [
        ['day_of_week' => 1, 'start_time' => '09:00', 'end_time' => '10:30', 'exceptions' => []],
        ['day_of_week' => 3, 'start_time' => '13:00', 'end_time' => '15:00', 'exceptions' => []],
    ],
    'commitments' => [],
    'breaks' => [
        ['start_date' => '2026-04-06', 'end_date' => '2026-04-10'],
    ],
    'expected' => [
        '2026-04-06' => ['day_of_week' => 1, 'is_break' => true, 'lecture_minutes' => 0, 'commitment_minutes' => 0, 'available_minutes' => 0, 'recommended_study_minutes' => 0],
        '2026-04-07' => ['day_of_week' => 2, 'is_break' => true, 'lecture_minutes' => 0, 'commitment_minutes' => 0, 'available_minutes' => 0, 'recommended_study_minutes' => 0],
        '2026-04-08' => ['day_of_week' => 3, 'is_break' => true, 'lecture_minutes' => 0, 'commitment_minutes' => 0, 'available_minutes' => 0, 'recommended_study_minutes' => 0],
        '2026-04-09' => ['day_of_week' => 4, 'is_break' => true, 'lecture_minutes' => 0, 'commitment_minutes' => 0, 'available_minutes' => 0, 'recommended_study_minutes' => 0],
        '2026-04-10' => ['day_of_week' => 5, 'is_break' => true, 'lecture_minutes' => 0, 'commitment_minutes' => 0, 'available_minutes' => 0, 'recommended_study_minutes' => 0],
    ],
];
