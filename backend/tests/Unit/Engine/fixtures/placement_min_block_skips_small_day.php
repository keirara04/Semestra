<?php

// Day 1 only has 20 minutes free, below the 30-minute viable block
// floor, so it's skipped entirely rather than producing a too-small block.
return [
    'day_start_time' => '09:00',
    'capacity_by_date' => [
        '2026-01-01' => 20,
        '2026-01-02' => 150,
        '2026-01-03' => 150,
    ],
    'tasks' => [
        ['id' => 1, 'remaining_minutes' => 300, 'depends_on_task_id' => null, 'dependency_done' => true],
    ],
    'expected' => [
        [
            'task_id' => 1,
            'blocks' => [
                ['date' => '2026-01-02', 'start_time' => '09:00', 'end_time' => '11:30', 'minutes' => 150],
                ['date' => '2026-01-03', 'start_time' => '09:00', 'end_time' => '11:30', 'minutes' => 150],
            ],
            'unplaced_minutes' => 0,
            'skipped_for_dependency' => false,
        ],
    ],
];
