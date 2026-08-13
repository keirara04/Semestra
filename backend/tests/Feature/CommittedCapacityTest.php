<?php

namespace Tests\Feature;

use App\Models\CalendarBlock;
use App\Models\Course;
use App\Models\Semester;
use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

/**
 * An accepted CalendarBlock (e.g. an already-started focus session) is
 * committed capacity even before it's completed — see "Placement" in
 * mdfile/semester-command-center.md. Feasibility and Ranking must both
 * see a reduced day, not the raw capacity-engine number.
 */
class CommittedCapacityTest extends TestCase
{
    use RefreshDatabase;

    public function test_an_accepted_calendar_block_reduces_available_capacity_for_feasibility(): void
    {
        $monday = Carbon::parse('2026-05-04 08:00', 'UTC');
        $this->travelTo($monday);

        $user = User::factory()->create(['timezone' => 'UTC', 'max_study_hours_per_day' => 6]);
        $semester = Semester::factory()->for($user)->create();
        $course = Course::factory()->for($user)->for($semester)->create();

        // 6h/day capacity (max_study_hours_per_day) — an existing accepted
        // 5h block should leave only 1h (60 min) free that day.
        CalendarBlock::factory()->for($user)->create([
            'status' => 'accepted',
            'start_at' => $monday->copy()->setTime(9, 0),
            'end_at' => $monday->copy()->setTime(14, 0),
        ]);

        $task = Task::factory()->for($user)->for($course)->create([
            'due_at' => $monday->copy()->setTime(23, 59),
            'remaining_estimate_minutes' => 120,
            'status' => 'open',
        ]);

        $response = $this->actingAs($user, 'sanctum')->getJson('/api/planning/feasibility');

        $response->assertOk()
            ->assertJsonPath('tasks.0.task_id', $task->id)
            ->assertJsonPath('tasks.0.feasible', false)
            ->assertJsonPath('tasks.0.deficit_minutes', 60);
    }
}
