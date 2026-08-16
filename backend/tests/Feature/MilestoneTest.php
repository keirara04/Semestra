<?php

namespace Tests\Feature;

use App\Models\Assessment;
use App\Models\Course;
use App\Models\Milestone;
use App\Models\Semester;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MilestoneTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_user_can_create_a_milestone(): void
    {
        $user = User::factory()->create();
        $semester = Semester::factory()->for($user)->create();
        $course = Course::factory()->for($user)->for($semester)->create();
        $assessment = Assessment::factory()->for($user)->for($course)->create();

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/milestones', [
            'assessment_id' => $assessment->id,
            'title' => 'Draft outline',
            'estimate_minutes' => 60,
        ]);

        $response->assertCreated();
        $this->assertDatabaseHas('milestones', ['user_id' => $user->id, 'assessment_id' => $assessment->id, 'title' => 'Draft outline']);
    }

    public function test_show_includes_linked_tasks(): void
    {
        $user = User::factory()->create();
        $semester = Semester::factory()->for($user)->create();
        $course = Course::factory()->for($user)->for($semester)->create();
        $assessment = Assessment::factory()->for($user)->for($course)->create();
        $milestone = Milestone::factory()->for($user)->for($assessment)->create();

        $response = $this->actingAs($user, 'sanctum')->getJson("/api/milestones/{$milestone->id}");

        $response->assertOk()->assertJsonStructure(['id', 'tasks']);
    }

    public function test_a_user_cannot_attach_a_milestone_to_another_users_assessment(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();
        $semester = Semester::factory()->for($other)->create();
        $course = Course::factory()->for($other)->for($semester)->create();
        $assessment = Assessment::factory()->for($other)->for($course)->create();

        $this->actingAs($user, 'sanctum')->postJson('/api/milestones', [
            'assessment_id' => $assessment->id,
            'title' => 'Hijacked',
        ])->assertStatus(422);
    }

    public function test_a_user_can_update_and_delete_their_milestone(): void
    {
        $user = User::factory()->create();
        $semester = Semester::factory()->for($user)->create();
        $course = Course::factory()->for($user)->for($semester)->create();
        $assessment = Assessment::factory()->for($user)->for($course)->create();
        $milestone = Milestone::factory()->for($user)->for($assessment)->create();

        $this->actingAs($user, 'sanctum')
            ->putJson("/api/milestones/{$milestone->id}", ['done' => true])
            ->assertOk()
            ->assertJsonPath('done', true);

        $this->actingAs($user, 'sanctum')
            ->deleteJson("/api/milestones/{$milestone->id}")
            ->assertNoContent();

        $this->assertDatabaseMissing('milestones', ['id' => $milestone->id]);
    }

    public function test_a_user_cannot_view_another_users_milestone(): void
    {
        $owner = User::factory()->create();
        $intruder = User::factory()->create();
        $semester = Semester::factory()->for($owner)->create();
        $course = Course::factory()->for($owner)->for($semester)->create();
        $assessment = Assessment::factory()->for($owner)->for($course)->create();
        $milestone = Milestone::factory()->for($owner)->for($assessment)->create();

        $this->actingAs($intruder, 'sanctum')
            ->getJson("/api/milestones/{$milestone->id}")
            ->assertNotFound();
    }
}
