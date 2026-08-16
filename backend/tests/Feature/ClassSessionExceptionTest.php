<?php

namespace Tests\Feature;

use App\Models\ClassSession;
use App\Models\ClassSessionException;
use App\Models\Course;
use App\Models\Semester;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ClassSessionExceptionTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_user_can_create_a_cancellation(): void
    {
        $user = User::factory()->create();
        $semester = Semester::factory()->for($user)->create();
        $course = Course::factory()->for($user)->for($semester)->create();
        $session = ClassSession::factory()->for($user)->for($course)->create();

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/class-session-exceptions', [
            'class_session_id' => $session->id,
            'date' => '2026-10-14',
            'type' => 'cancelled',
        ]);

        $response->assertCreated();
        $this->assertDatabaseHas('class_session_exceptions', [
            'user_id' => $user->id,
            'class_session_id' => $session->id,
            'type' => 'cancelled',
        ]);
    }

    public function test_a_moved_session_requires_new_start_and_end_times(): void
    {
        $user = User::factory()->create();
        $semester = Semester::factory()->for($user)->create();
        $course = Course::factory()->for($user)->for($semester)->create();
        $session = ClassSession::factory()->for($user)->for($course)->create();

        $this->actingAs($user, 'sanctum')->postJson('/api/class-session-exceptions', [
            'class_session_id' => $session->id,
            'date' => '2026-10-14',
            'type' => 'moved',
        ])->assertStatus(422);

        $this->actingAs($user, 'sanctum')->postJson('/api/class-session-exceptions', [
            'class_session_id' => $session->id,
            'date' => '2026-10-14',
            'type' => 'moved',
            'new_start_time' => '14:00',
            'new_end_time' => '15:00',
        ])->assertCreated();
    }

    public function test_a_user_cannot_attach_an_exception_to_another_users_class_session(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();
        $semester = Semester::factory()->for($other)->create();
        $course = Course::factory()->for($other)->for($semester)->create();
        $session = ClassSession::factory()->for($other)->for($course)->create();

        $this->actingAs($user, 'sanctum')->postJson('/api/class-session-exceptions', [
            'class_session_id' => $session->id,
            'date' => '2026-10-14',
            'type' => 'cancelled',
        ])->assertStatus(422);
    }

    public function test_a_user_can_update_and_delete_their_exception(): void
    {
        $user = User::factory()->create();
        $semester = Semester::factory()->for($user)->create();
        $course = Course::factory()->for($user)->for($semester)->create();
        $session = ClassSession::factory()->for($user)->for($course)->create();
        $exception = ClassSessionException::factory()->for($user)->for($session)->create();

        $this->actingAs($user, 'sanctum')
            ->putJson("/api/class-session-exceptions/{$exception->id}", ['type' => 'cancelled'])
            ->assertOk();

        $this->actingAs($user, 'sanctum')
            ->deleteJson("/api/class-session-exceptions/{$exception->id}")
            ->assertNoContent();

        $this->assertDatabaseMissing('class_session_exceptions', ['id' => $exception->id]);
    }

    public function test_a_user_cannot_view_another_users_exception(): void
    {
        $owner = User::factory()->create();
        $intruder = User::factory()->create();
        $semester = Semester::factory()->for($owner)->create();
        $course = Course::factory()->for($owner)->for($semester)->create();
        $session = ClassSession::factory()->for($owner)->for($course)->create();
        $exception = ClassSessionException::factory()->for($owner)->for($session)->create();

        $this->actingAs($intruder, 'sanctum')
            ->getJson("/api/class-session-exceptions/{$exception->id}")
            ->assertNotFound();
    }
}
