<?php

namespace Database\Factories;

use App\Models\Course;
use App\Models\Task;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Task>
 */
class TaskFactory extends Factory
{
    protected $model = Task::class;

    public function definition(): array
    {
        return [
            'course_id' => Course::factory(),
            'title' => $this->faker->sentence(3),
            'estimated_minutes' => 60,
            'remaining_estimate_minutes' => 60,
            'status' => 'open',
        ];
    }
}
