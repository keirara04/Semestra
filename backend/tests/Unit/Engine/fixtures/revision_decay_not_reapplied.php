<?php

// Same overdue scenario as revision_missed_review_decays, but the decay
// has already been applied once for this review; must not re-decay
// every day it stays overdue.
return [
    'today' => '2026-01-10',
    'daily_cap_minutes' => 45,
    'topics' => [
        [
            'id' => 1,
            'confidence' => 'comfortable',
            'review_stage' => 0,
            'next_review_due_date' => '2025-12-31',
            'has_open_review_task' => false,
            'already_decayed_for_this_review' => true,
        ],
    ],
    'expected' => [
        ['topic_id' => 1, 'action' => 'generate', 'due_date' => '2025-12-31', 'decay_confidence' => false, 'new_confidence' => null],
    ],
];
