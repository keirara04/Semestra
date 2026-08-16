<?php

namespace Database\Factories;

use App\Models\Semester;
use App\Models\TimetableImport;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<TimetableImport>
 */
class TimetableImportFactory extends Factory
{
    protected $model = TimetableImport::class;

    public function definition(): array
    {
        return [
            'semester_id' => Semester::factory(),
            'source_url' => 'https://everytime.kr/@testcode',
            'status' => 'pending',
            'payload' => [],
        ];
    }
}
