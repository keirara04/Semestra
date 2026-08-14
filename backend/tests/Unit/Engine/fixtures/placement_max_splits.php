<?php

// 1000 minutes needed, 200 min/day available across 10 days (2000 total
// available), but max_splits caps it at 3 blocks (600 min placed), 400
// minutes stay unplaced even though more capacity exists later.
return [
    'day_start_time' => '09:00',
    'capacity_by_date' => [
        '2026-01-01' => 200,
        '2026-01-02' => 200,
        '2026-01-03' => 200,
        '2026-01-04' => 200,
        '2026-01-05' => 200,
    ],
    'tasks' => [
        ['id' => 1, 'remaining_minutes' => 1000, 'depends_on_task_id' => null, 'dependency_done' => true],
    ],
    'expected' => [
        [
            'task_id' => 1,
            'blocks' => [
                ['date' => '2026-01-01', 'start_time' => '09:00', 'end_time' => '12:20', 'minutes' => 200],
                ['date' => '2026-01-02', 'start_time' => '09:00', 'end_time' => '12:20', 'minutes' => 200],
                ['date' => '2026-01-03', 'start_time' => '09:00', 'end_time' => '12:20', 'minutes' => 200],
            ],
            'unplaced_minutes' => 400,
            'skipped_for_dependency' => false,
        ],
    ],
];
