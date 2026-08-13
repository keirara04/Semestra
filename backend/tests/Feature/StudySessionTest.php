<?php

namespace Tests\Feature;

use App\Models\CalendarBlock;
use App\Models\Course;
use App\Models\Semester;
use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StudySessionTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_full_start_pause_resume_end_reflect_cycle_updates_the_task(): void
    {
        $this->travelTo(now());

        $user = User::factory()->create();
        $semester = Semester::factory()->for($user)->create();
        $course = Course::factory()->for($user)->for($semester)->create();
        $task = Task::factory()->for($user)->for($course)->create([
            'remaining_estimate_minutes' => 90,
            'actual_minutes_logged' => 0,
        ]);
        $block = CalendarBlock::factory()->for($user)->create(['task_id' => $task->id]);

        $actingAs = $this->actingAs($user, 'sanctum');

        $start = $actingAs->postJson('/api/study-sessions/start', [
            'calendar_block_id' => $block->id,
            'planned_minutes' => 60,
        ])->assertCreated();
        $sessionId = $start->json('id');

        $this->travel(10)->minutes();
        $actingAs->postJson("/api/study-sessions/{$sessionId}/pause")->assertOk();

        $this->travel(5)->minutes();
        $actingAs->postJson("/api/study-sessions/{$sessionId}/resume")->assertOk();

        $this->travel(20)->minutes();
        $end = $actingAs->postJson("/api/study-sessions/{$sessionId}/end")->assertOk();

        // 10 + 20 = 30 minutes of running time; the 5-minute pause is excluded.
        $end->assertJsonPath('actual_minutes', 30);

        $reflect = $actingAs->postJson("/api/study-sessions/{$sessionId}/reflect", [
            'outcome' => 'partial',
            'remaining_estimate_minutes' => 60,
            'completion_percent' => 40,
        ])->assertOk();

        $reflect->assertJsonPath('outcome', 'partial');

        $task->refresh();
        $this->assertSame(60, $task->remaining_estimate_minutes);
        $this->assertSame(40, $task->completion_percent);
        $this->assertSame(30, $task->actual_minutes_logged);
        $this->assertSame('open', $task->status);
    }

    public function test_reflecting_completed_closes_the_task(): void
    {
        $this->travelTo(now());

        $user = User::factory()->create();
        $semester = Semester::factory()->for($user)->create();
        $course = Course::factory()->for($user)->for($semester)->create();
        $task = Task::factory()->for($user)->for($course)->create(['status' => 'open']);
        $block = CalendarBlock::factory()->for($user)->create(['task_id' => $task->id]);

        $actingAs = $this->actingAs($user, 'sanctum');
        $start = $actingAs->postJson('/api/study-sessions/start', [
            'calendar_block_id' => $block->id,
            'planned_minutes' => 30,
        ])->assertCreated();

        $this->travel(30)->minutes();
        $actingAs->postJson("/api/study-sessions/{$start->json('id')}/end")->assertOk();
        $actingAs->postJson("/api/study-sessions/{$start->json('id')}/reflect", [
            'outcome' => 'completed',
        ])->assertOk();

        $task->refresh();
        $this->assertSame('done', $task->status);
        $this->assertSame(0, $task->remaining_estimate_minutes);
        $this->assertSame(100, $task->completion_percent);
    }
}
