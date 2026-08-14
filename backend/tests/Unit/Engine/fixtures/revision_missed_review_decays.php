<?php

// 10 days overdue on a 1-day-interval stage: more than one review's
// worth of time has passed with zero engagement, so confidence decays
// one step (comfortable -> learning).
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
            'already_decayed_for_this_review' => false,
        ],
    ],
    'expected' => [
        ['topic_id' => 1, 'action' => 'generate', 'due_date' => '2025-12-31', 'decay_confidence' => true, 'new_confidence' => 'learning'],
    ],
];
