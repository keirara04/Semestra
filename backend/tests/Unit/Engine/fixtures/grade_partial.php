<?php

// Some items graded, some not, no target set — currentStanding computed
// over completed weight only; expected/neededAverage stay null since
// there's no course target to project against.
return [
    'items' => [
        ['id' => 1, 'name' => 'Quiz 1', 'weighting' => 10, 'max_score' => 20, 'achieved_score' => 17, 'grade_category_id' => null, 'pass_hurdle_percent' => null],
        ['id' => 2, 'name' => 'Assignment 1', 'weighting' => 15, 'max_score' => 30, 'achieved_score' => 24, 'grade_category_id' => null, 'pass_hurdle_percent' => null],
        ['id' => 3, 'name' => 'Midterm', 'weighting' => 25, 'max_score' => 100, 'achieved_score' => null, 'grade_category_id' => null, 'pass_hurdle_percent' => null],
        ['id' => 4, 'name' => 'Final', 'weighting' => 25, 'max_score' => 100, 'achieved_score' => null, 'grade_category_id' => null, 'pass_hurdle_percent' => null],
        ['id' => 5, 'name' => 'Participation', 'weighting' => 25, 'max_score' => 100, 'achieved_score' => null, 'grade_category_id' => null, 'pass_hurdle_percent' => null],
    ],
    'categories' => [],
    'target_percent' => null,
    'expected' => [
        'current_standing' => 82.0,
        'completed_weight' => 25.0,
        'total_weight' => 100.0,
        'weights_normalized' => false,
        'ungraded_weight_percent' => 75.0,
        'best_case' => 95.5,
        'conservative' => 82.375,
        'expected' => null,
        'needed_average' => null,
        'pass_hurdles' => [],
    ],
];
