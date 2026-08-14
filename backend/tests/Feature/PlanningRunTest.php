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

class PlanningRunTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_run_creates_suggested_calendar_blocks_for_open_tasks(): void
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

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/planning/run');

        $response->assertOk()->assertJsonPath('created_blocks', 1);

        $this->assertDatabaseHas('calendar_blocks', [
            'task_id' => $task->id,
            'status' => 'suggested',
            'type' => 'study',
        ]);
    }

    public function test_a_second_run_replaces_suggested_blocks_without_touching_accepted_ones(): void
    {
        $this->travelTo(Carbon::parse('2026-05-04 08:00', 'UTC'));

        $user = User::factory()->create(['timezone' => 'UTC', 'max_study_hours_per_day' => 6]);
        $semester = Semester::factory()->for($user)->create();
        $course = Course::factory()->for($user)->for($semester)->create();
        Task::factory()->for($user)->for($course)->create([
            'due_at' => Carbon::parse('2026-05-06 23:59', 'UTC'),
            'remaining_estimate_minutes' => 90,
            'status' => 'open',
        ]);

        $accepted = CalendarBlock::factory()->for($user)->create([
            'status' => 'accepted',
            'start_at' => Carbon::parse('2026-05-04 09:00', 'UTC'),
            'end_at' => Carbon::parse('2026-05-04 10:00', 'UTC'),
        ]);

        $actingAs = $this->actingAs($user, 'sanctum');
        $actingAs->postJson('/api/planning/run')->assertOk();
        $firstRunSuggestedIds = CalendarBlock::where('status', 'suggested')->pluck('id');

        $actingAs->postJson('/api/planning/run')->assertOk();
        $secondRunSuggestedIds = CalendarBlock::where('status', 'suggested')->pluck('id');

        // Different row IDs: the first run's suggestions were deleted and
        // replaced, not duplicated alongside the old ones.
        $this->assertNotEquals($firstRunSuggestedIds->sort()->values(), $secondRunSuggestedIds->sort()->values());
        $this->assertDatabaseHas('calendar_blocks', ['id' => $accepted->id, 'status' => 'accepted']);
    }

    public function test_returns_empty_result_and_writes_nothing_when_no_open_tasks_exist(): void
    {
        $user = User::factory()->create(['timezone' => 'UTC', 'max_study_hours_per_day' => 6]);

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/planning/run');

        $response->assertOk()->assertJsonPath('created_blocks', 0);
        $this->assertDatabaseCount('calendar_blocks', 0);
    }
}
