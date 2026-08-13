<?php

// One task, 300 minutes remaining, due day 3. 120 min/day capacity for
// 3 days (today..due) = 360 available, comfortably fits.
return [
    'today' => '2026-01-01',
    'capacity_by_date' => [
        '2026-01-01' => 120,
        '2026-01-02' => 120,
        '2026-01-03' => 120,
    ],
    'tasks' => [
        ['id' => 1, 'remaining_minutes' => 300, 'due_date' => '2026-01-03'],
    ],
    'expected' => [
        'tasks' => [
            ['task_id' => 1, 'feasible' => true, 'recommended_start' => '2026-01-01', 'latest_safe_start' => '2026-01-01', 'deficit_minutes' => 0],
        ],
        // 120+120+120=360 available, 300 reserved greedily from the
        // earliest days: day1 fully consumed (120), day2 fully consumed
        // (120), day3 takes the remaining 60.
        'remaining_capacity_by_date' => [
            '2026-01-01' => 0,
            '2026-01-02' => 0,
            '2026-01-03' => 60,
        ],
    ],
];
