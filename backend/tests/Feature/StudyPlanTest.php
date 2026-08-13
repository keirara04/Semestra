<?php

namespace Tests\Feature;

use App\Models\CalendarBlock;
use App\Models\Course;
use App\Models\Semester;
use App\Models\StudyPlan;
use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Artisan;
use Tests\TestCase;

class StudyPlanTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_run_creates_a_versioned_study_plan_linked_to_its_blocks(): void
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

        $this->actingAs($user, 'sanctum')->postJson('/api/planning/run')->assertOk();

        $this->assertDatabaseCount('study_plans', 1);
        $plan = StudyPlan::first();
        $this->assertSame('on_demand', $plan->trigger);
        $this->assertArrayHasKey('ranking', $plan->explanation_snapshot);

        $block = CalendarBlock::where('status', 'suggested')->first();
        $this->assertSame($plan->id, $block->study_plan_id);
    }

    public function test_latest_plan_endpoint_returns_the_most_recent_run(): void
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

        $actingAs = $this->actingAs($user, 'sanctum');
        $actingAs->postJson('/api/planning/run')->assertOk();

        $response = $actingAs->getJson('/api/planning/plans/latest');

        $response->assertOk()->assertJsonPath('trigger', 'on_demand');
    }

    public function test_nightly_command_runs_for_every_user_with_open_tasks(): void
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

        $userWithoutTasks = User::factory()->create(['timezone' => 'UTC', 'max_study_hours_per_day' => 6]);

        Artisan::call('planning:run-nightly');

        $this->assertDatabaseHas('study_plans', ['user_id' => $user->id, 'trigger' => 'nightly']);
        $this->assertDatabaseMissing('study_plans', ['user_id' => $userWithoutTasks->id]);
    }

    public function test_moving_a_block_marks_it_as_moved_and_it_survives_a_replan(): void
    {
        $this->travelTo(Carbon::parse('2026-05-04 08:00', 'UTC'));

        $user = User::factory()->create(['timezone' => 'UTC', 'max_study_hours_per_day' => 6]);
        $block = CalendarBlock::factory()->for($user)->create([
            'status' => 'accepted',
            'start_at' => Carbon::parse('2026-05-04 09:00', 'UTC'),
            'end_at' => Carbon::parse('2026-05-04 10:00', 'UTC'),
        ]);

        $actingAs = $this->actingAs($user, 'sanctum');
        $response = $actingAs->putJson("/api/calendar-blocks/{$block->id}", [
            'start_at' => Carbon::parse('2026-05-04 14:00', 'UTC')->toIso8601String(),
            'end_at' => Carbon::parse('2026-05-04 15:00', 'UTC')->toIso8601String(),
        ]);

        $response->assertOk()->assertJsonPath('status', 'moved');

        $actingAs->postJson('/api/planning/run')->assertOk();

        $this->assertDatabaseHas('calendar_blocks', ['id' => $block->id, 'status' => 'moved']);
    }
}
