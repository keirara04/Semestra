<?php

namespace Tests\Feature;

use App\Models\Course;
use App\Models\GradeItem;
use App\Models\Semester;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CourseGradesTest extends TestCase
{
    use RefreshDatabase;

    public function test_grades_endpoint_reflects_graded_and_ungraded_items(): void
    {
        $user = User::factory()->create();
        $semester = Semester::factory()->for($user)->create();
        $course = Course::factory()->for($user)->for($semester)->create(['grade_target' => '85']);
        GradeItem::factory()->for($user)->for($course)->create([
            'name' => 'Assignment 1',
            'weighting' => 50,
            'max_score' => 100,
            'achieved_score' => 70,
        ]);
        GradeItem::factory()->for($user)->for($course)->create([
            'name' => 'Final',
            'weighting' => 50,
            'max_score' => 100,
            'achieved_score' => null,
        ]);

        $response = $this->actingAs($user, 'sanctum')->getJson("/api/courses/{$course->id}/grades");

        $response->assertOk()
            ->assertJsonPath('current_standing', 70)
            ->assertJsonPath('expected', 77.5)
            ->assertJsonPath('needed_average', 100);
    }

    public function test_a_user_cannot_view_another_users_course_grades(): void
    {
        $owner = User::factory()->create();
        $intruder = User::factory()->create();
        $semester = Semester::factory()->for($owner)->create();
        $course = Course::factory()->for($owner)->for($semester)->create();

        $this->actingAs($intruder, 'sanctum')
            ->getJson("/api/courses/{$course->id}/grades")
            ->assertNotFound();
    }
}
