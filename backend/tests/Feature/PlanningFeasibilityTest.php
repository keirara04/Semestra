<?php

namespace Tests\Feature;

use App\Models\Assessment;
use App\Models\Course;
use App\Models\Semester;
use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class PlanningFeasibilityTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_task_inherits_its_assessments_due_date_when_it_has_none_of_its_own(): void
    {
        $monday = Carbon::parse('2026-05-04', 'UTC');
        $this->travelTo($monday->copy()->setTime(8, 0));

        $user = User::factory()->create(['timezone' => 'UTC', 'max_study_hours_per_day' => 6]);
        $semester = Semester::factory()->for($user)->create();
        $course = Course::factory()->for($user)->for($semester)->create();
        $assessment = Assessment::factory()->for($user)->for($course)->create([
            'due_at' => $monday->copy()->addDays(2),
        ]);
        $task = Task::factory()->for($user)->for($course)->create([
            'assessment_id' => $assessment->id,
            'due_at' => null,
            'remaining_estimate_minutes' => 60,
            'status' => 'open',
        ]);

        $response = $this->actingAs($user, 'sanctum')->getJson('/api/planning/feasibility');

        $response->assertOk()
            ->assertJsonPath('tasks.0.task_id', $task->id)
            ->assertJsonPath('tasks.0.feasible', true);
    }

    public function test_returns_empty_report_when_no_mandatory_tasks_exist(): void
    {
        $user = User::factory()->create(['timezone' => 'UTC', 'max_study_hours_per_day' => 6]);

        $response = $this->actingAs($user, 'sanctum')->getJson('/api/planning/feasibility');

        $response->assertOk()->assertJson(['tasks' => [], 'remaining_capacity_by_date' => []]);
    }
}
