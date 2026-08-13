<?php

namespace Tests\Feature;

use App\Models\Assessment;
use App\Models\ClassSession;
use App\Models\Course;
use App\Models\Semester;
use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class TodayTest extends TestCase
{
    use RefreshDatabase;

    public function test_today_aggregates_classes_assessments_and_tasks(): void
    {
        $monday = Carbon::parse('2026-05-04', 'UTC'); // a Monday
        $this->travelTo($monday->copy()->setTime(8, 0));

        $user = User::factory()->create(['timezone' => 'UTC', 'max_study_hours_per_day' => 6]);
        $semester = Semester::factory()->for($user)->create();
        $course = Course::factory()->for($user)->for($semester)->create(['title' => 'Deep Learning']);
        ClassSession::factory()->for($user)->for($course)->create([
            'day_of_week' => 1,
            'start_time' => '09:00',
            'end_time' => '10:30',
        ]);
        Assessment::factory()->for($user)->for($course)->create([
            'title' => 'Report',
            'due_at' => $monday->copy()->addDays(3),
            'status' => 'in_progress',
        ]);
        Task::factory()->for($user)->for($course)->create([
            'title' => 'Draft methodology',
            'status' => 'open',
            'due_at' => $monday->copy()->addDay(),
        ]);

        $response = $this->actingAs($user, 'sanctum')->getJson('/api/today');

        $response->assertOk()
            ->assertJsonPath('date', '2026-05-04')
            ->assertJsonPath('ranking_is_basic', true)
            ->assertJsonPath('classes_today.0.course_title', 'Deep Learning')
            ->assertJsonPath('assessments_due_soon.0.title', 'Report')
            ->assertJsonPath('tasks.0.title', 'Draft methodology')
            ->assertJsonPath('capacity.lecture_minutes', 90);
    }
}
