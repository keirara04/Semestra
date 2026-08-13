<?php

namespace Database\Factories;

use App\Models\ClassSession;
use App\Models\Course;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ClassSession>
 */
class ClassSessionFactory extends Factory
{
    protected $model = ClassSession::class;

    public function definition(): array
    {
        return [
            'course_id' => Course::factory(),
            'type' => 'lecture',
            'day_of_week' => $this->faker->numberBetween(0, 6),
            'start_time' => '09:00',
            'end_time' => '10:30',
            'location' => $this->faker->buildingNumber(),
        ];
    }
}
