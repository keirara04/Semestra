<?php

return [
    'today' => '2026-01-10',
    'daily_cap_minutes' => 45,
    'topics' => [
        [
            'id' => 1,
            'confidence' => 'learning',
            'review_stage' => 0,
            'next_review_due_date' => '2026-01-10',
            'has_open_review_task' => false,
            'already_decayed_for_this_review' => false,
        ],
    ],
    'expected' => [
        ['topic_id' => 1, 'action' => 'generate', 'due_date' => '2026-01-10', 'decay_confidence' => false, 'new_confidence' => null],
    ],
];
