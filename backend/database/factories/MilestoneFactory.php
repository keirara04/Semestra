<?php

namespace Database\Factories;

use App\Models\Assessment;
use App\Models\Milestone;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Milestone>
 */
class MilestoneFactory extends Factory
{
    protected $model = Milestone::class;

    public function definition(): array
    {
        return [
            'assessment_id' => Assessment::factory(),
            'title' => $this->faker->sentence(3),
            'estimate_minutes' => 120,
            'done' => false,
            'order' => 0,
        ];
    }
}
