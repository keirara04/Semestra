<?php

// 180 of 200 available minutes before due = 90% consumed -> high urgency.
// No grade weight (default 20), moderate effort_risk, zero staleness
// (touched today).
return [
    'now' => '2026-01-01',
    'tasks' => [
        [
            'id' => 1,
            'remaining_minutes' => 180,
            'due_date' => '2026-01-05',
            'available_minutes_before_due' => 200,
            'grade_weight' => null,
            'estimate_confidence' => null,
            'last_touched_at' => '2026-01-01',
            'is_revision_linked' => false,
        ],
    ],
    'expected' => [
        [
            'task_id' => 1,
            'score' => 49.375,
            'factors' => ['urgency' => 90.0, 'academic_impact' => 20.0, 'effort_risk' => 62.5, 'staleness' => 0.0, 'revision_need' => 0.0],
            'reasons' => [
                'Due soon relative to remaining capacity: high urgency.',
                'Large or low-confidence estimate: worth starting early.',
            ],
        ],
    ],
];
