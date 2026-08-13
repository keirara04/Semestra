<?php

namespace Database\Factories;

use App\Models\Course;
use App\Models\SyllabusDraft;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<SyllabusDraft>
 */
class SyllabusDraftFactory extends Factory
{
    protected $model = SyllabusDraft::class;

    public function definition(): array
    {
        return [
            'course_id' => Course::factory(),
            'status' => 'pending',
            'candidates' => ['assessments' => [], 'tasks' => []],
            'model' => 'openai/gpt-4o-mini',
        ];
    }
}
