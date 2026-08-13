<?php

namespace Database\Factories;

use App\Models\Assessment;
use App\Models\Course;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Assessment>
 */
class AssessmentFactory extends Factory
{
    protected $model = Assessment::class;

    public function definition(): array
    {
        return [
            'course_id' => Course::factory(),
            'type' => 'report',
            'title' => $this->faker->sentence(4),
            'due_at' => $this->faker->dateTimeBetween('now', '+3 weeks'),
            'status' => 'not_started',
            'estimated_minutes' => 600,
        ];
    }
}
