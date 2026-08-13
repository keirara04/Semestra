<?php

namespace Database\Factories;

use App\Models\CalendarBlock;
use App\Models\StudySession;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<StudySession>
 */
class StudySessionFactory extends Factory
{
    protected $model = StudySession::class;

    public function definition(): array
    {
        $started = $this->faker->dateTimeBetween('-1 week', 'now');

        return [
            'calendar_block_id' => CalendarBlock::factory(),
            'planned_minutes' => 30,
            'actual_minutes' => 30,
            'status' => 'ended',
            'started_at' => $started,
            'ended_at' => (clone $started)->modify('+30 minutes'),
            'outcome' => 'completed',
        ];
    }
}
