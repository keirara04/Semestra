<?php

// Declared weights sum to 80, not 100 — normalize by the declared total
// rather than erroring, and flag it visibly (weights_normalized: true).
return [
    'items' => [
        ['id' => 1, 'name' => 'Assignment 1', 'weighting' => 40, 'max_score' => 100, 'achieved_score' => 80, 'grade_category_id' => null, 'pass_hurdle_percent' => null],
        ['id' => 2, 'name' => 'Final', 'weighting' => 40, 'max_score' => 100, 'achieved_score' => null, 'grade_category_id' => null, 'pass_hurdle_percent' => null],
    ],
    'categories' => [],
    'target_percent' => null,
    'expected' => [
        'current_standing' => 80.0,
        'completed_weight' => 40.0,
        'total_weight' => 80.0,
        'weights_normalized' => true,
        'ungraded_weight_percent' => 50.0,
        'best_case' => 90.0,
        'conservative' => 80.0,
        'expected' => null,
        'needed_average' => null,
        'pass_hurdles' => [],
    ],
];
