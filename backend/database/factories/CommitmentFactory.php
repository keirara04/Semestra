<?php

namespace Database\Factories;

use App\Models\Commitment;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Commitment>
 */
class CommitmentFactory extends Factory
{
    protected $model = Commitment::class;

    public function definition(): array
    {
        return [
            'title' => 'Sleep',
            'type' => 'sleep',
            'day_of_week' => $this->faker->numberBetween(0, 6),
            'date' => null,
            'start_time' => '23:00',
            'end_time' => '07:00',
        ];
    }
}
