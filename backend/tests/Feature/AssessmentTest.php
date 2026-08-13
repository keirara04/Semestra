<?php

namespace Tests\Feature;

use App\Models\Assessment;
use App\Models\Course;
use App\Models\Semester;
use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AssessmentTest extends TestCase
{
    use RefreshDatabase;

    public function test_remaining_minutes_sums_only_open_tasks(): void
    {
        $user = User::factory()->create();
        $semester = Semester::factory()->for($user)->create();
        $course = Course::factory()->for($user)->for($semester)->create();
        $assessment = Assessment::factory()->for($user)->for($course)->create();
        Task::factory()->for($user)->for($course)->create([
            'assessment_id' => $assessment->id,
            'remaining_estimate_minutes' => 90,
            'status' => 'open',
        ]);
        Task::factory()->for($user)->for($course)->create([
            'assessment_id' => $assessment->id,
            'remaining_estimate_minutes' => 45,
            'status' => 'done',
        ]);

        $response = $this->actingAs($user, 'sanctum')->getJson("/api/assessments/{$assessment->id}");

        $response->assertOk()->assertJsonPath('remaining_minutes', 90);
    }

    public function test_a_task_dependency_cycle_is_rejected(): void
    {
        $user = User::factory()->create();
        $semester = Semester::factory()->for($user)->create();
        $course = Course::factory()->for($user)->for($semester)->create();
        $taskA = Task::factory()->for($user)->for($course)->create();
        $taskB = Task::factory()->for($user)->for($course)->create([
            'depends_on_task_id' => $taskA->id,
        ]);

        // A depends on B would close the A -> B -> A loop.
        $response = $this->actingAs($user, 'sanctum')->putJson("/api/tasks/{$taskA->id}", [
            'depends_on_task_id' => $taskB->id,
        ]);

        $response->assertUnprocessable()->assertJsonValidationErrors('depends_on_task_id');
    }
}
