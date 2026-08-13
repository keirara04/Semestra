<?php

// A pass hurdle is a separate pass/fail check independent of the weighted
// average — the item can still contribute normally to currentStanding
// even while failing its hurdle.
return [
    'items' => [
        ['id' => 1, 'name' => 'Final Exam', 'weighting' => 100, 'max_score' => 100, 'achieved_score' => 55, 'grade_category_id' => null, 'pass_hurdle_percent' => 60],
    ],
    'categories' => [],
    'target_percent' => null,
    'expected' => [
        'current_standing' => 55.0,
        'completed_weight' => 100.0,
        'total_weight' => 100.0,
        'weights_normalized' => false,
        'ungraded_weight_percent' => 0.0,
        'best_case' => 55.0,
        'conservative' => 55.0,
        'expected' => null,
        'needed_average' => null,
        'pass_hurdles' => [
            ['item_name' => 'Final Exam', 'required_percent' => 60.0, 'achieved_percent' => 55.0, 'passed' => false],
        ],
    ],
];
