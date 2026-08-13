<?php

// Heavy grade weight (90%) and a large, low-confidence estimate — high
// academic_impact and effort_risk even though there's plenty of slack
// before the deadline (low urgency).
return [
    'now' => '2026-01-01',
    'tasks' => [
        [
            'id' => 3,
            'remaining_minutes' => 300,
            'due_date' => '2026-01-10',
            'available_minutes_before_due' => 1000,
            'grade_weight' => 90,
            'estimate_confidence' => 'low',
            'last_touched_at' => '2026-01-01',
            'topic_confidence' => null,
            'topic_last_reviewed_at' => null,
        ],
    ],
    'expected' => [
        [
            'task_id' => 3,
            'score' => 43.5,
            'factors' => ['urgency' => 30.0, 'academic_impact' => 90.0, 'effort_risk' => 90.0, 'staleness' => 0.0, 'revision_need' => 0.0],
            'reasons' => [
                'Worth a large share of the course grade: high impact.',
                'Large or low-confidence estimate: worth starting early.',
            ],
        ],
    ],
];
