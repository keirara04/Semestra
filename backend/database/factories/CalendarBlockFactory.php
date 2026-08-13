<?php

namespace Database\Factories;

use App\Models\CalendarBlock;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<CalendarBlock>
 */
class CalendarBlockFactory extends Factory
{
    protected $model = CalendarBlock::class;

    public function definition(): array
    {
        $start = $this->faker->dateTimeBetween('now', '+1 week');

        return [
            'type' => 'study',
            'status' => 'accepted',
            'title' => $this->faker->sentence(3),
            'start_at' => $start,
            'end_at' => (clone $start)->modify('+90 minutes'),
        ];
    }
}
