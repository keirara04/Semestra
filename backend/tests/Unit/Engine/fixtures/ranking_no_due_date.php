<?php

// No due date -> flexible work, fixed low urgency default (never zero).
// High confidence keeps effort_risk low; 12 days untouched against the
// default 14-day runway pushes staleness up.
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
    ],
    'expected' => [
        [
            'task_id' => 2,
            'score' => 24.232142857142858,
            'factors' => ['urgency' => 10.0, 'academic_impact' => 20.0, 'effort_risk' => 22.5, 'staleness' => 85.71428571428571, 'revision_need' => 0.0],
            'reasons' => [
                'Not worked on in a while relative to time left: rising staleness.',
            ],
        ],
    ],
];
