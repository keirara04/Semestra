<?php

// Course target of 80% set — expected and needed-average become real
// numbers instead of null.
return [
    'items' => [
        ['id' => 1, 'name' => 'Assignment 1', 'weighting' => 50, 'max_score' => 100, 'achieved_score' => 70, 'grade_category_id' => null, 'pass_hurdle_percent' => null],
        ['id' => 2, 'name' => 'Final', 'weighting' => 50, 'max_score' => 100, 'achieved_score' => null, 'grade_category_id' => null, 'pass_hurdle_percent' => null],
    ],
    'categories' => [],
    'target_percent' => 80.0,
    'expected' => [
        'current_standing' => 70.0,
        'completed_weight' => 50.0,
        'total_weight' => 100.0,
        'weights_normalized' => false,
        'ungraded_weight_percent' => 50.0,
        'best_case' => 85.0,
        'conservative' => 70.0,
        'expected' => 75.0,
        'needed_average' => 90.0,
        'pass_hurdles' => [],
    ],
];
