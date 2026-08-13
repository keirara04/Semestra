<?php

namespace Tests\Feature;

use App\Models\Assessment;
use App\Models\Course;
use App\Models\Semester;
use App\Models\Topic;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TopicTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_user_can_create_a_topic(): void
    {
        $user = User::factory()->create();
        $semester = Semester::factory()->for($user)->create();
        $course = Course::factory()->for($user)->for($semester)->create();

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/topics', [
            'course_id' => $course->id,
            'title' => 'Backpropagation',
        ]);

        $response->assertCreated()
            ->assertJsonPath('title', 'Backpropagation')
            ->assertJsonPath('confidence', 'not_started');
    }

    public function test_updating_confidence_sets_last_reviewed_at(): void
    {
        $user = User::factory()->create();
        $semester = Semester::factory()->for($user)->create();
        $course = Course::factory()->for($user)->for($semester)->create();
        $topic = Topic::factory()->for($user)->for($course)->create();

        $this->assertNull($topic->last_reviewed_at);

        $response = $this->actingAs($user, 'sanctum')->putJson("/api/topics/{$topic->id}", [
            'confidence' => 'comfortable',
        ]);

        $response->assertOk()->assertJsonPath('confidence', 'comfortable');
        $this->assertNotNull($response->json('last_reviewed_at'));
    }

    public function test_a_topic_can_be_tagged_to_an_assessment(): void
    {
        $user = User::factory()->create();
        $semester = Semester::factory()->for($user)->create();
        $course = Course::factory()->for($user)->for($semester)->create();
        $assessment = Assessment::factory()->for($user)->for($course)->create();

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/topics', [
            'course_id' => $course->id,
            'title' => 'SQL joins',
            'assessment_ids' => [$assessment->id],
        ]);

        $response->assertCreated();
        $this->assertDatabaseHas('assessment_topic', [
            'assessment_id' => $assessment->id,
            'topic_id' => $response->json('id'),
        ]);
    }

    public function test_a_user_cannot_view_another_users_topic(): void
    {
        $owner = User::factory()->create();
        $intruder = User::factory()->create();
        $semester = Semester::factory()->for($owner)->create();
        $course = Course::factory()->for($owner)->for($semester)->create();
        $topic = Topic::factory()->for($owner)->for($course)->create();

        $this->actingAs($intruder, 'sanctum')
            ->getJson("/api/topics/{$topic->id}")
            ->assertNotFound();
    }
}
