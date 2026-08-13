<?php

// Revision-linked task (topic_confidence set): not_started confidence and
// 21 days since last review (past the 14-day recency reference) pushes
// revision_need to its max.
return [
    'now' => '2026-01-10',
    'tasks' => [
        [
            'id' => 4,
            'remaining_minutes' => 30,
            'due_date' => null,
            'available_minutes_before_due' => null,
            'grade_weight' => null,
            'estimate_confidence' => null,
            'last_touched_at' => '2026-01-10',
            'topic_confidence' => 'not_started',
            'topic_last_reviewed_at' => '2025-12-20',
        ],
    ],
    'expected' => [
        [
            'task_id' => 4,
            'score' => 22.6875,
            'factors' => ['urgency' => 10.0, 'academic_impact' => 20.0, 'effort_risk' => 31.25, 'staleness' => 0.0, 'revision_need' => 100.0],
            'reasons' => [
                'Confidence is low and it has been a while since review: due for revision.',
            ],
        ],
    ],
];
