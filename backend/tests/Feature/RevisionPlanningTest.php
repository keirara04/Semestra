<?php

namespace Tests\Feature;

use App\Models\CalendarBlock;
use App\Models\Course;
use App\Models\Semester;
use App\Models\Task;
use App\Models\Topic;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class RevisionPlanningTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_planning_run_generates_a_review_task_for_a_due_topic(): void
    {
        $this->travelTo(Carbon::parse('2026-05-04 08:00', 'UTC'));

        $user = User::factory()->create(['timezone' => 'UTC', 'max_study_hours_per_day' => 6]);
        $semester = Semester::factory()->for($user)->create();
        $course = Course::factory()->for($user)->for($semester)->create();
        $topic = Topic::factory()->for($user)->for($course)->create([
            'confidence' => 'learning',
            'review_stage' => 0,
            'last_reviewed_at' => Carbon::parse('2026-05-03'),
            'next_review_at' => Carbon::parse('2026-05-04'), // due today
        ]);

        $this->actingAs($user, 'sanctum')->postJson('/api/planning/run')->assertOk();

        $this->assertDatabaseHas('tasks', [
            'topic_id' => $topic->id,
            'status' => 'open',
            'title' => "Review: {$topic->title}",
        ]);
    }

    public function test_completing_a_review_task_advances_the_topics_schedule(): void
    {
        $this->travelTo(Carbon::parse('2026-05-04 08:00', 'UTC'));

        $user = User::factory()->create(['timezone' => 'UTC', 'max_study_hours_per_day' => 6]);
        $semester = Semester::factory()->for($user)->create();
        $course = Course::factory()->for($user)->for($semester)->create();
        $topic = Topic::factory()->for($user)->for($course)->create([
            'review_stage' => 0,
            'next_review_at' => Carbon::parse('2026-05-04'),
        ]);
        $task = Task::factory()->for($user)->for($course)->create([
            'topic_id' => $topic->id,
            'remaining_estimate_minutes' => 15,
            'status' => 'open',
        ]);
        $block = CalendarBlock::factory()->for($user)->create(['task_id' => $task->id]);

        $actingAs = $this->actingAs($user, 'sanctum');
        $start = $actingAs->postJson('/api/study-sessions/start', [
            'calendar_block_id' => $block->id,
            'planned_minutes' => 15,
        ])->assertCreated();

        $this->travel(15)->minutes();
        $actingAs->postJson("/api/study-sessions/{$start->json('id')}/end")->assertOk();
        $actingAs->postJson("/api/study-sessions/{$start->json('id')}/reflect", [
            'outcome' => 'completed',
        ])->assertOk();

        $topic->refresh();
        $this->assertSame(1, $topic->review_stage);
        $this->assertNotNull($topic->next_review_at);
        // Stage 1 -> 3-day interval from the actual completion date.
        $this->assertSame('2026-05-07', $topic->next_review_at->format('Y-m-d'));
    }

    public function test_a_planning_run_decays_confidence_for_a_long_missed_review(): void
    {
        $this->travelTo(Carbon::parse('2026-05-04 08:00', 'UTC'));

        $user = User::factory()->create(['timezone' => 'UTC', 'max_study_hours_per_day' => 6]);
        $semester = Semester::factory()->for($user)->create();
        $course = Course::factory()->for($user)->for($semester)->create();
        $topic = Topic::factory()->for($user)->for($course)->create([
            'confidence' => 'comfortable',
            'review_stage' => 0,
            'next_review_at' => Carbon::parse('2026-04-20'), // 14 days overdue on a 1-day-interval stage
        ]);

        $this->actingAs($user, 'sanctum')->postJson('/api/planning/run')->assertOk();

        $topic->refresh();
        $this->assertSame('learning', $topic->confidence);
        $this->assertNotNull($topic->missed_decay_applied_at);
    }
}
