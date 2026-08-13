<?php

// Task A (150 min, due day 2) and Task B (200 min, due day 3) share 100
// min/day capacity over 3 days (300 total) against 350 total demand —
// genuinely infeasible regardless of ordering. EDF processes A first
// (earlier deadline) since it's provably optimal: if EDF can't fit B,
// no other ordering could have either.
return [
    'today' => '2026-01-01',
    'capacity_by_date' => [
        '2026-01-01' => 100,
        '2026-01-02' => 100,
        '2026-01-03' => 100,
    ],
    'tasks' => [
        ['id' => 2, 'remaining_minutes' => 200, 'due_date' => '2026-01-03'],
        ['id' => 1, 'remaining_minutes' => 150, 'due_date' => '2026-01-02'],
    ],
    'expected' => [
        'tasks' => [
            // A (id 1, earlier deadline) processed and reserved first.
            ['task_id' => 1, 'feasible' => true, 'recommended_start' => '2026-01-01', 'latest_safe_start' => '2026-01-01', 'deficit_minutes' => 0],
            // B (id 2) only has 0+50+100=150 left after A reserved
            // 100+50 from days 1-2, short of its 200 minute demand.
            ['task_id' => 2, 'feasible' => false, 'recommended_start' => null, 'latest_safe_start' => null, 'deficit_minutes' => 50],
        ],
        'remaining_capacity_by_date' => [
            '2026-01-01' => 0,
            '2026-01-02' => 50,
            '2026-01-03' => 100,
        ],
    ],
];
