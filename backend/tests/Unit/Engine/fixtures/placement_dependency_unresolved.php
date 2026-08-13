<?php

// Task 2 depends on task 1, which isn't done and isn't in this ranked
// list at all (e.g. it's mandatory-reserved, or ranks so low it wasn't
// included) — task 2 is skipped entirely this run.
return [
    'day_start_time' => '09:00',
    'capacity_by_date' => ['2026-01-01' => 200],
    'tasks' => [
        ['id' => 2, 'remaining_minutes' => 90, 'depends_on_task_id' => 1, 'dependency_done' => false],
    ],
    'expected' => [
        [
            'task_id' => 2,
            'blocks' => [],
            'unplaced_minutes' => 90,
            'skipped_for_dependency' => true,
        ],
    ],
];
