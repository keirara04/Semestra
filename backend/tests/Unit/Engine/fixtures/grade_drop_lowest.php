<?php

// Category with drop_lowest_count=2 and 3 graded labs: the 2 lowest
// (50%, 70%) are excluded entirely (not just zero-scored), leaving only
// the 90% lab counted from that category.
return [
    'items' => [
        ['id' => 1, 'name' => 'Lab 1', 'weighting' => 5, 'max_score' => 10, 'achieved_score' => 5, 'grade_category_id' => 1, 'pass_hurdle_percent' => null],
        ['id' => 2, 'name' => 'Lab 2', 'weighting' => 5, 'max_score' => 10, 'achieved_score' => 9, 'grade_category_id' => 1, 'pass_hurdle_percent' => null],
        ['id' => 3, 'name' => 'Lab 3', 'weighting' => 5, 'max_score' => 10, 'achieved_score' => 7, 'grade_category_id' => 1, 'pass_hurdle_percent' => null],
        ['id' => 4, 'name' => 'Final Exam', 'weighting' => 90, 'max_score' => 100, 'achieved_score' => null, 'grade_category_id' => null, 'pass_hurdle_percent' => null],
    ],
    'categories' => [
        ['id' => 1, 'drop_lowest_count' => 2, 'best_n' => null],
    ],
    'target_percent' => null,
    'expected' => [
        'current_standing' => 90.0,
        'completed_weight' => 5.0,
        'total_weight' => 95.0,
        'weights_normalized' => true,
        'ungraded_weight_percent' => 94.73684210526316,
        'best_case' => 99.47368421052632,
        'conservative' => 90.0,
        'expected' => null,
        'needed_average' => null,
        'pass_hurdles' => [],
    ],
];
