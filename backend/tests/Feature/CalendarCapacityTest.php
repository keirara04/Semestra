<?php

namespace Tests\Feature;

use App\Models\ClassSession;
use App\Models\Commitment;
use App\Models\Course;
use App\Models\Semester;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CalendarCapacityTest extends TestCase
{
    use RefreshDatabase;

    public function test_capacity_endpoint_reflects_class_sessions_and_commitments(): void
    {
        $user = User::factory()->create(['timezone' => 'UTC', 'max_study_hours_per_day' => 6]);
        $semester = Semester::factory()->for($user)->create();
        $course = Course::factory()->for($user)->for($semester)->create();
        ClassSession::factory()->for($user)->for($course)->create([
            'day_of_week' => 1, // 2026-05-04 is a Monday
            'start_time' => '09:00',
            'end_time' => '10:30',
        ]);
        Commitment::factory()->for($user)->create([
            'day_of_week' => 1,
            'date' => null,
            'start_time' => '23:00',
            'end_time' => '07:00',
        ]);

        $response = $this->actingAs($user, 'sanctum')->getJson(
            '/api/calendar/capacity?from=2026-05-04&to=2026-05-04'
        );

        $response->assertOk()->assertJson([
            [
                'date' => '2026-05-04',
                'day_of_week' => 1,
                'is_break' => false,
                'lecture_minutes' => 90,
                'commitment_minutes' => 480,
                'available_minutes' => 870,
                'recommended_study_minutes' => 360,
            ],
        ]);
    }
}
