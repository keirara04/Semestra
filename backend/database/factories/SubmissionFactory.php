<?php

namespace Database\Factories;

use App\Models\Assessment;
use App\Models\Submission;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Submission>
 */
class SubmissionFactory extends Factory
{
    protected $model = Submission::class;

    public function definition(): array
    {
        return [
            'assessment_id' => Assessment::factory(),
        ];
    }
}
