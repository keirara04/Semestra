<?php

namespace Tests\Feature;

use App\Models\Assessment;
use App\Models\Course;
use App\Models\Semester;
use App\Models\Submission;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SubmissionTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_user_can_record_a_submission(): void
    {
        $user = User::factory()->create();
        $semester = Semester::factory()->for($user)->create();
        $course = Course::factory()->for($user)->for($semester)->create();
        $assessment = Assessment::factory()->for($user)->for($course)->create();

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/submissions', [
            'assessment_id' => $assessment->id,
            'url' => 'https://example.com/receipt',
            'submitted_at' => '2026-10-14T10:00:00Z',
        ]);

        $response->assertCreated();
        $this->assertDatabaseHas('submissions', ['user_id' => $user->id, 'assessment_id' => $assessment->id]);
    }

    public function test_a_user_cannot_attach_a_submission_to_another_users_assessment(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();
        $semester = Semester::factory()->for($other)->create();
        $course = Course::factory()->for($other)->for($semester)->create();
        $assessment = Assessment::factory()->for($other)->for($course)->create();

        $this->actingAs($user, 'sanctum')->postJson('/api/submissions', [
            'assessment_id' => $assessment->id,
        ])->assertStatus(422);
    }

    public function test_a_user_can_update_and_delete_their_submission(): void
    {
        $user = User::factory()->create();
        $semester = Semester::factory()->for($user)->create();
        $course = Course::factory()->for($user)->for($semester)->create();
        $assessment = Assessment::factory()->for($user)->for($course)->create();
        $submission = Submission::factory()->for($user)->for($assessment)->create();

        $this->actingAs($user, 'sanctum')
            ->putJson("/api/submissions/{$submission->id}", ['notes' => 'Resubmitted after feedback'])
            ->assertOk()
            ->assertJsonPath('notes', 'Resubmitted after feedback');

        $this->actingAs($user, 'sanctum')
            ->deleteJson("/api/submissions/{$submission->id}")
            ->assertNoContent();

        $this->assertDatabaseMissing('submissions', ['id' => $submission->id]);
    }

    public function test_a_user_cannot_view_another_users_submission(): void
    {
        $owner = User::factory()->create();
        $intruder = User::factory()->create();
        $semester = Semester::factory()->for($owner)->create();
        $course = Course::factory()->for($owner)->for($semester)->create();
        $assessment = Assessment::factory()->for($owner)->for($course)->create();
        $submission = Submission::factory()->for($owner)->for($assessment)->create();

        $this->actingAs($intruder, 'sanctum')
            ->getJson("/api/submissions/{$submission->id}")
            ->assertNotFound();
    }
}
