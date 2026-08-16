<?php

namespace Database\Factories;

use App\Models\ClassSession;
use App\Models\ClassSessionException;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ClassSessionException>
 */
class ClassSessionExceptionFactory extends Factory
{
    protected $model = ClassSessionException::class;

    public function definition(): array
    {
        return [
            'class_session_id' => ClassSession::factory(),
            'date' => '2026-10-14',
            'type' => 'cancelled',
            'new_start_time' => null,
            'new_end_time' => null,
            'new_location' => null,
        ];
    }
}
