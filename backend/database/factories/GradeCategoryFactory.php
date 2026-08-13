<?php

namespace Database\Factories;

use App\Models\Course;
use App\Models\GradeCategory;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<GradeCategory>
 */
class GradeCategoryFactory extends Factory
{
    protected $model = GradeCategory::class;

    public function definition(): array
    {
        return [
            'course_id' => Course::factory(),
            'name' => 'Labs',
            'drop_lowest_count' => null,
            'best_n' => null,
            'best_of_m' => null,
        ];
    }
}
