<?php

// Task 1 (the blocker) ranks first and gets placed on day 1. Task 2
// depends on it and isn't done yet, so its blocks are confined to dates
// strictly after task 1's last placed date — day 2, not day 1, even
// though day 1 still has room.
return [
    'day_start_time' => '09:00',
    'capacity_by_date' => [
        '2026-01-01' => 150,
        '2026-01-02' => 150,
    ],
    'tasks' => [
        ['id' => 1, 'remaining_minutes' => 100, 'depends_on_task_id' => null, 'dependency_done' => true],
        ['id' => 2, 'remaining_minutes' => 100, 'depends_on_task_id' => 1, 'dependency_done' => false],
    ],
    'expected' => [
        [
            'task_id' => 1,
            'blocks' => [
                ['date' => '2026-01-01', 'start_time' => '09:00', 'end_time' => '10:40', 'minutes' => 100],
            ],
            'unplaced_minutes' => 0,
            'skipped_for_dependency' => false,
        ],
        [
            'task_id' => 2,
            'blocks' => [
                ['date' => '2026-01-02', 'start_time' => '09:00', 'end_time' => '10:40', 'minutes' => 100],
            ],
            'unplaced_minutes' => 0,
            'skipped_for_dependency' => false,
        ],
    ],
];
