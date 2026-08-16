<?php

namespace Tests\Feature;

use App\Models\ClassSession;
use App\Models\Course;
use App\Models\Semester;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CalendarOccurrencesTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_returns_occurrences_within_a_normal_range(): void
    {
        $user = User::factory()->create(['timezone' => 'UTC']);
        $semester = Semester::factory()->for($user)->create([
            'start_date' => '2026-09-01',
            'end_date' => '2026-12-15',
        ]);
        $course = Course::factory()->for($user)->for($semester)->create();
        ClassSession::factory()->for($user)->for($course)->create([
            'day_of_week' => 1,
            'start_time' => '09:00:00',
            'end_time' => '10:00:00',
        ]);

        $response = $this->actingAs($user, 'sanctum')
            ->getJson('/api/calendar/occurrences?from=2026-09-07&to=2026-09-13');

        $response->assertOk();
        $this->assertNotEmpty($response->json());
    }

    // Regression test for the range-span guard added alongside this test —
    // without it, a request like from=1900-01-01&to=2200-01-01 expands
    // every ClassSession/Commitment day-by-day for ~110,000 days in a
    // single synchronous request.
    public function test_a_range_longer_than_a_year_is_rejected(): void
    {
        $user = User::factory()->create(['timezone' => 'UTC']);

        $response = $this->actingAs($user, 'sanctum')
            ->getJson('/api/calendar/occurrences?from=1900-01-01&to=2200-01-01');

        $response->assertStatus(422);
    }

    public function test_to_before_from_is_rejected(): void
    {
        $user = User::factory()->create(['timezone' => 'UTC']);

        $response = $this->actingAs($user, 'sanctum')
            ->getJson('/api/calendar/occurrences?from=2026-09-13&to=2026-09-07');

        $response->assertStatus(422);
    }
}
