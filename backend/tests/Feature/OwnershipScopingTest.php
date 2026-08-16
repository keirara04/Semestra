<?php

namespace Tests\Feature;

use App\Models\Course;
use App\Models\Semester;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Pattern test for "Authorization model" in the plan: every user-owned
 * model (BelongsToUser trait + Policy) must be invisible across users at
 * both the query layer (global scope / route-model binding) and the
 * authorization layer (Policy). Every Phase 1+ resource should get an
 * equivalent case here; Semester and Course stand in as the pattern.
 */
class OwnershipScopingTest extends TestCase
{
    use RefreshDatabase;

    public function test_creating_a_semester_sets_the_owner_automatically(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/semesters', [
            'name' => 'Fall 2026',
            'start_date' => '2026-09-01',
            'end_date' => '2026-12-15',
        ]);

        $response->assertCreated();
        $this->assertDatabaseHas('semesters', [
            'name' => 'Fall 2026',
            'user_id' => $user->id,
        ]);
    }

    public function test_a_users_semester_index_excludes_other_users_semesters(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        Semester::factory()->for($owner)->create();
        Semester::factory()->for($other)->create();

        $response = $this->actingAs($owner, 'sanctum')->getJson('/api/semesters');

        $response->assertOk()->assertJsonCount(1);
    }

    public function test_a_user_cannot_view_another_users_semester(): void
    {
        $owner = User::factory()->create();
        $intruder = User::factory()->create();
        $semester = Semester::factory()->for($owner)->create();

        $response = $this->actingAs($intruder, 'sanctum')->getJson("/api/semesters/{$semester->id}");

        $response->assertNotFound();
    }

    public function test_a_user_cannot_update_or_delete_another_users_course(): void
    {
        $owner = User::factory()->create();
        $intruder = User::factory()->create();
        $semester = Semester::factory()->for($owner)->create();
        $course = Course::factory()->for($owner)->for($semester)->create();

        $this->actingAs($intruder, 'sanctum')
            ->putJson("/api/courses/{$course->id}", ['title' => 'Hijacked'])
            ->assertNotFound();

        $this->actingAs($intruder, 'sanctum')
            ->deleteJson("/api/courses/{$course->id}")
            ->assertNotFound();

        $this->assertDatabaseHas('courses', ['id' => $course->id, 'title' => $course->title]);
    }

    /**
     * Regression test for OwnedExists (app/Rules/OwnedExists.php): a plain
     * `exists:table,column` rule runs on the raw query builder and would
     * happily accept another user's course_id here — Task would then be
     * created pointing at a resource the caller doesn't own.
     */
    public function test_a_user_cannot_attach_a_task_to_another_users_course(): void
    {
        $owner = User::factory()->create();
        $intruder = User::factory()->create();
        $semester = Semester::factory()->for($owner)->create();
        $course = Course::factory()->for($owner)->for($semester)->create();

        $response = $this->actingAs($intruder, 'sanctum')->postJson('/api/tasks', [
            'course_id' => $course->id,
            'title' => 'Hijacked task',
        ]);

        $response->assertStatus(422);
        $this->assertDatabaseMissing('tasks', ['course_id' => $course->id]);
    }

    public function test_a_user_can_still_attach_a_task_to_their_own_course(): void
    {
        $owner = User::factory()->create();
        $semester = Semester::factory()->for($owner)->create();
        $course = Course::factory()->for($owner)->for($semester)->create();

        $response = $this->actingAs($owner, 'sanctum')->postJson('/api/tasks', [
            'course_id' => $course->id,
            'title' => 'My task',
        ]);

        $response->assertCreated();
        $this->assertDatabaseHas('tasks', ['course_id' => $course->id, 'title' => 'My task']);
    }
}
