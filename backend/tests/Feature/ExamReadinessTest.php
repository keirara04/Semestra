<?php

namespace Tests\Feature;

use App\Models\Assessment;
use App\Models\Course;
use App\Models\Semester;
use App\Models\Topic;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class ExamReadinessTest extends TestCase
{
    use RefreshDatabase;

    public function test_readiness_reflects_linked_topic_confidence(): void
    {
        $this->travelTo(Carbon::parse('2026-05-01 08:00', 'UTC'));

        $user = User::factory()->create(['timezone' => 'UTC']);
        $semester = Semester::factory()->for($user)->create();
        $course = Course::factory()->for($user)->for($semester)->create();
        $exam = Assessment::factory()->for($user)->for($course)->create([
            'type' => 'exam',
            'due_at' => Carbon::parse('2026-05-10 09:00', 'UTC'),
        ]);
        $confident = Topic::factory()->for($user)->for($course)->create(['confidence' => 'confident']);
        $weak = Topic::factory()->for($user)->for($course)->create(['confidence' => 'not_started']);
        $exam->topics()->sync([$confident->id, $weak->id]);

        $response = $this->actingAs($user, 'sanctum')->getJson("/api/assessments/{$exam->id}/readiness");

        $response->assertOk()
            ->assertJsonPath('readiness_percent', 50)
            ->assertJsonPath('target_minutes_remaining', 45)
            ->assertJsonCount(2, 'topics');
    }

    public function test_readiness_is_null_with_no_linked_topics(): void
    {
        $user = User::factory()->create(['timezone' => 'UTC']);
        $semester = Semester::factory()->for($user)->create();
        $course = Course::factory()->for($user)->for($semester)->create();
        $exam = Assessment::factory()->for($user)->for($course)->create([
            'type' => 'exam',
            'due_at' => Carbon::now()->addDays(5),
        ]);

        $response = $this->actingAs($user, 'sanctum')->getJson("/api/assessments/{$exam->id}/readiness");

        $response->assertOk()->assertJsonPath('readiness_percent', null);
    }

    public function test_a_user_cannot_view_another_users_exam_readiness(): void
    {
        $owner = User::factory()->create();
        $intruder = User::factory()->create();
        $semester = Semester::factory()->for($owner)->create();
        $course = Course::factory()->for($owner)->for($semester)->create();
        $exam = Assessment::factory()->for($owner)->for($course)->create(['type' => 'exam']);

        $this->actingAs($intruder, 'sanctum')
            ->getJson("/api/assessments/{$exam->id}/readiness")
            ->assertNotFound();
    }
}
