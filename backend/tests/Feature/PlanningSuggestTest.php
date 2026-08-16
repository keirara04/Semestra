<?php

namespace Tests\Feature;

use App\Models\Course;
use App\Models\Semester;
use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class PlanningSuggestTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_returns_suggested_days_without_writing_anything(): void
    {
        $this->travelTo(Carbon::parse('2026-05-04 08:00', 'UTC'));

        $user = User::factory()->create(['timezone' => 'UTC', 'max_study_hours_per_day' => 6]);
        $semester = Semester::factory()->for($user)->create();
        $course = Course::factory()->for($user)->for($semester)->create();
        $task = Task::factory()->for($user)->for($course)->create([
            'due_at' => Carbon::parse('2026-05-06 23:59', 'UTC'),
            'remaining_estimate_minutes' => 90,
            'status' => 'open',
        ]);

        $response = $this->actingAs($user, 'sanctum')->getJson('/api/planning/suggest');

        $response->assertOk();
        $days = $response->json('days');
        $this->assertNotEmpty($days);
        $this->assertSame($task->id, $days[0]['items'][0]['taskId']);

        // Read-only counterpart to /api/planning/run — must never persist.
        $this->assertDatabaseCount('calendar_blocks', 0);
        $this->assertDatabaseCount('study_plans', 0);
    }

    public function test_it_returns_no_days_when_there_are_no_open_tasks(): void
    {
        $user = User::factory()->create(['timezone' => 'UTC']);

        $response = $this->actingAs($user, 'sanctum')->getJson('/api/planning/suggest');

        $response->assertOk()->assertJson(['days' => []]);
    }

    public function test_it_only_suggests_within_the_capped_horizon(): void
    {
        $this->travelTo(Carbon::parse('2026-05-04 08:00', 'UTC'));

        $user = User::factory()->create(['timezone' => 'UTC', 'max_study_hours_per_day' => 6]);
        $semester = Semester::factory()->for($user)->create();
        $course = Course::factory()->for($user)->for($semester)->create();
        // Due well past the 7-day suggestion horizon.
        Task::factory()->for($user)->for($course)->create([
            'due_at' => Carbon::parse('2026-06-04 23:59', 'UTC'),
            'remaining_estimate_minutes' => 90,
            'status' => 'open',
        ]);

        $response = $this->actingAs($user, 'sanctum')->getJson('/api/planning/suggest');

        $response->assertOk();
        foreach ($response->json('days') as $day) {
            $this->assertLessThanOrEqual('2026-05-11', $day['date']);
        }
    }
}
