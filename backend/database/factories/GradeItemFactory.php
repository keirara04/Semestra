<?php

namespace Database\Factories;

use App\Models\Course;
use App\Models\GradeItem;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<GradeItem>
 */
class GradeItemFactory extends Factory
{
    protected $model = GradeItem::class;

    public function definition(): array
    {
        return [
            'course_id' => Course::factory(),
            'name' => 'Midterm',
            'weighting' => 25,
            'max_score' => 100,
        ];
    }
}
