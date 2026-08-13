<?php

return [
    'day_start_time' => '09:00',
    'capacity_by_date' => ['2026-01-01' => 200],
    'tasks' => [
        ['id' => 1, 'remaining_minutes' => 150, 'depends_on_task_id' => null, 'dependency_done' => true],
    ],
    'expected' => [
        [
            'task_id' => 1,
            'blocks' => [
                ['date' => '2026-01-01', 'start_time' => '09:00', 'end_time' => '11:30', 'minutes' => 150],
            ],
            'unplaced_minutes' => 0,
            'skipped_for_dependency' => false,
        ],
    ],
];
