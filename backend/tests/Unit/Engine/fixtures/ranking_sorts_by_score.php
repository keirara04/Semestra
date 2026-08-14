<?php

// Two tasks, output must be sorted score descending regardless of input
// order: the higher-urgency task (id 1, from ranking_urgency_high) beats
// the flexible no-due-date task (id 2, from ranking_no_due_date).
return [
    'now' => '2026-01-01',
    'tasks' => [
        [
            'id' => 2,
            'remaining_minutes' => 60,
            'due_date' => null,
            'available_minutes_before_due' => null,
            'grade_weight' => null,
            'estimate_confidence' => 'high',
            'last_touched_at' => '2025-12-20',
            'topic_confidence' => null,
            'topic_last_reviewed_at' => null,
        ],
        [
            'id' => 1,
            'remaining_minutes' => 180,
            'due_date' => '2026-01-05',
            'available_minutes_before_due' => 200,
            'grade_weight' => null,
            'estimate_confidence' => null,
            'last_touched_at' => '2026-01-01',
            'topic_confidence' => null,
            'topic_last_reviewed_at' => null,
        ],
    ],
    'expected_order' => [1, 2],
];
