<?php

namespace Database\Factories;

use App\Models\AcademicCalendarException;
use App\Models\Semester;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AcademicCalendarException>
 */
class AcademicCalendarExceptionFactory extends Factory
{
    protected $model = AcademicCalendarException::class;

    public function definition(): array
    {
        return [
            'semester_id' => Semester::factory(),
            'label' => 'Reading week',
            'start_date' => '2026-10-12',
            'end_date' => '2026-10-16',
        ];
    }
}
