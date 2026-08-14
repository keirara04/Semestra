<?php

// A single task needing more than every minute available before its
// deadline, infeasible in isolation. Nothing gets reserved for it; the
// deficit is reported plainly rather than inventing a partial schedule.
return [
    'today' => '2026-01-01',
    'capacity_by_date' => [
        '2026-01-01' => 60,
        '2026-01-02' => 60,
    ],
    'tasks' => [
        ['id' => 1, 'remaining_minutes' => 720, 'due_date' => '2026-01-02'],
    ],
    'expected' => [
        'tasks' => [
            ['task_id' => 1, 'feasible' => false, 'recommended_start' => null, 'latest_safe_start' => null, 'deficit_minutes' => 600],
        ],
        'remaining_capacity_by_date' => [
            '2026-01-01' => 60,
            '2026-01-02' => 60,
        ],
    ],
];
