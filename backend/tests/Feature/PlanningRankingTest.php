<?php

namespace Tests\Feature;

use App\Models\Course;
use App\Models\Semester;
use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class PlanningRankingTest extends TestCase
{
    use RefreshDatabase;

    public function test_ranking_orders_open_tasks_by_score(): void
    {
        $this->travelTo(Carbon::parse('2026-05-04 08:00', 'UTC'));

        $user = User::factory()->create(['timezone' => 'UTC', 'max_study_hours_per_day' => 6]);
        $semester = Semester::factory()->for($user)->create();
        $course = Course::factory()->for($user)->for($semester)->create();

        $urgent = Task::factory()->for($user)->for($course)->create([
            'due_at' => Carbon::parse('2026-05-05 23:59', 'UTC'),
            'remaining_estimate_minutes' => 300,
            'status' => 'open',
        ]);
        Task::factory()->for($user)->for($course)->create([
            'due_at' => null,
            'remaining_estimate_minutes' => 30,
            'status' => 'open',
        ]);

        $response = $this->actingAs($user, 'sanctum')->getJson('/api/planning/ranking');

        $response->assertOk()->assertJsonPath('ranking.0.task_id', $urgent->id);
    }

    public function test_returns_empty_ranking_when_no_open_tasks_exist(): void
    {
        $user = User::factory()->create(['timezone' => 'UTC', 'max_study_hours_per_day' => 6]);

        $response = $this->actingAs($user, 'sanctum')->getJson('/api/planning/ranking');

        $response->assertOk()->assertJson(['ranking' => []]);
    }
}
