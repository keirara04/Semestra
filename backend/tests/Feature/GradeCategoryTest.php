<?php

namespace Tests\Feature;

use App\Models\Course;
use App\Models\GradeCategory;
use App\Models\Semester;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GradeCategoryTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_user_can_create_a_grade_category(): void
    {
        $user = User::factory()->create();
        $semester = Semester::factory()->for($user)->create();
        $course = Course::factory()->for($user)->for($semester)->create();

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/grade-categories', [
            'course_id' => $course->id,
            'name' => 'Labs',
            'drop_lowest_count' => 1,
        ]);

        $response->assertCreated();
        $this->assertDatabaseHas('grade_categories', ['user_id' => $user->id, 'course_id' => $course->id, 'name' => 'Labs']);
    }

    public function test_best_of_m_must_be_at_least_best_n(): void
    {
        $user = User::factory()->create();
        $semester = Semester::factory()->for($user)->create();
        $course = Course::factory()->for($user)->for($semester)->create();

        $this->actingAs($user, 'sanctum')->postJson('/api/grade-categories', [
            'course_id' => $course->id,
            'name' => 'Quizzes',
            'best_n' => 5,
            'best_of_m' => 3,
        ])->assertStatus(422);
    }

    public function test_a_user_cannot_attach_a_category_to_another_users_course(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();
        $semester = Semester::factory()->for($other)->create();
        $course = Course::factory()->for($other)->for($semester)->create();

        $this->actingAs($user, 'sanctum')->postJson('/api/grade-categories', [
            'course_id' => $course->id,
            'name' => 'Labs',
        ])->assertStatus(422);
    }

    public function test_a_user_can_update_and_delete_their_category(): void
    {
        $user = User::factory()->create();
        $semester = Semester::factory()->for($user)->create();
        $course = Course::factory()->for($user)->for($semester)->create();
        $category = GradeCategory::factory()->for($user)->for($course)->create();

        $this->actingAs($user, 'sanctum')
            ->putJson("/api/grade-categories/{$category->id}", ['name' => 'Renamed'])
            ->assertOk()
            ->assertJsonPath('name', 'Renamed');

        $this->actingAs($user, 'sanctum')
            ->deleteJson("/api/grade-categories/{$category->id}")
            ->assertNoContent();

        $this->assertDatabaseMissing('grade_categories', ['id' => $category->id]);
    }

    public function test_a_user_cannot_view_another_users_category(): void
    {
        $owner = User::factory()->create();
        $intruder = User::factory()->create();
        $semester = Semester::factory()->for($owner)->create();
        $course = Course::factory()->for($owner)->for($semester)->create();
        $category = GradeCategory::factory()->for($owner)->for($course)->create();

        $this->actingAs($intruder, 'sanctum')
            ->getJson("/api/grade-categories/{$category->id}")
            ->assertNotFound();
    }
}
