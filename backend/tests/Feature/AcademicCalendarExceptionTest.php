<?php

namespace Tests\Feature;

use App\Models\AcademicCalendarException;
use App\Models\Semester;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AcademicCalendarExceptionTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_user_can_create_a_calendar_exception(): void
    {
        $user = User::factory()->create();
        $semester = Semester::factory()->for($user)->create();

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/academic-calendar-exceptions', [
            'semester_id' => $semester->id,
            'label' => 'Reading week',
            'start_date' => '2026-10-12',
            'end_date' => '2026-10-16',
        ]);

        $response->assertCreated();
        $this->assertDatabaseHas('academic_calendar_exceptions', [
            'user_id' => $user->id,
            'semester_id' => $semester->id,
            'label' => 'Reading week',
        ]);
    }

    public function test_end_date_must_not_precede_start_date(): void
    {
        $user = User::factory()->create();
        $semester = Semester::factory()->for($user)->create();

        $this->actingAs($user, 'sanctum')->postJson('/api/academic-calendar-exceptions', [
            'semester_id' => $semester->id,
            'label' => 'Reading week',
            'start_date' => '2026-10-16',
            'end_date' => '2026-10-12',
        ])->assertStatus(422);
    }

    public function test_a_user_cannot_attach_an_exception_to_another_users_semester(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();
        $semester = Semester::factory()->for($other)->create();

        $this->actingAs($user, 'sanctum')->postJson('/api/academic-calendar-exceptions', [
            'semester_id' => $semester->id,
            'label' => 'Reading week',
            'start_date' => '2026-10-12',
            'end_date' => '2026-10-16',
        ])->assertStatus(422);
    }

    public function test_a_user_can_update_and_delete_their_exception(): void
    {
        $user = User::factory()->create();
        $semester = Semester::factory()->for($user)->create();
        $exception = AcademicCalendarException::factory()->for($user)->for($semester)->create();

        $this->actingAs($user, 'sanctum')
            ->putJson("/api/academic-calendar-exceptions/{$exception->id}", ['label' => 'Fall break'])
            ->assertOk()
            ->assertJsonPath('label', 'Fall break');

        $this->actingAs($user, 'sanctum')
            ->deleteJson("/api/academic-calendar-exceptions/{$exception->id}")
            ->assertNoContent();

        $this->assertDatabaseMissing('academic_calendar_exceptions', ['id' => $exception->id]);
    }

    public function test_a_user_cannot_view_another_users_exception(): void
    {
        $owner = User::factory()->create();
        $intruder = User::factory()->create();
        $semester = Semester::factory()->for($owner)->create();
        $exception = AcademicCalendarException::factory()->for($owner)->for($semester)->create();

        $this->actingAs($intruder, 'sanctum')
            ->getJson("/api/academic-calendar-exceptions/{$exception->id}")
            ->assertNotFound();
    }
}
