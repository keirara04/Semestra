<?php

namespace Database\Factories;

use App\Models\Course;
use App\Models\Semester;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Course>
 */
class CourseFactory extends Factory
{
    protected $model = Course::class;

    public function definition(): array
    {
        return [
            'semester_id' => Semester::factory(),
            'title' => $this->faker->words(3, true),
            'code' => strtoupper($this->faker->bothify('??####')),
            'colour' => $this->faker->hexColor(),
            'instructor' => $this->faker->name(),
            'credits' => $this->faker->numberBetween(1, 6),
            'grade_target' => 'A',
        ];
    }
}
