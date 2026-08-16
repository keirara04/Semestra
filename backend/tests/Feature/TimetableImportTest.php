<?php

namespace Tests\Feature;

use App\Models\Course;
use App\Models\Semester;
use App\Models\TimetableImport;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class TimetableImportTest extends TestCase
{
    use RefreshDatabase;

    public function test_store_returns_422_when_the_table_has_no_data(): void
    {
        Http::fake([
            'api.everytime.kr/*' => Http::response('<response><table status="-1"/></response>', 200),
        ]);

        $user = User::factory()->create();
        $semester = Semester::factory()->for($user)->create();

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/timetable-imports', [
            'semester_id' => $semester->id,
            'url' => 'https://everytime.kr/@somecode',
        ]);

        $response->assertStatus(422);
        $this->assertDatabaseCount('timetable_imports', 0);
    }

    public function test_store_returns_422_when_the_table_is_friends_only(): void
    {
        Http::fake([
            'api.everytime.kr/*' => Http::response('<response><table status="-2"/></response>', 200),
        ]);

        $user = User::factory()->create();
        $semester = Semester::factory()->for($user)->create();

        $this->actingAs($user, 'sanctum')->postJson('/api/timetable-imports', [
            'semester_id' => $semester->id,
            'url' => 'https://everytime.kr/@somecode',
        ])->assertStatus(422);
    }

    public function test_store_parses_subjects_from_a_real_shaped_response(): void
    {
        Http::fake([
            'api.everytime.kr/*' => Http::response(<<<'XML'
                <?xml version="1.0" encoding="UTF-8"?>
                <response>
                  <table year="2026" semester="2" status="1" identifier="somecode">
                    <subject id="1">
                      <internal value="COSE221-00"/>
                      <name value="Logic Design"/>
                      <professor value="Prof Lee"/>
                      <time value="...">
                        <data day="1" starttime="108" endtime="123" place="Room 301"/>
                        <data day="3" starttime="108" endtime="123" place="Room 301"/>
                      </time>
                      <place value=""/>
                      <credit value="3"/>
                      <closed value="0"/>
                    </subject>
                  </table>
                </response>
                XML, 200),
        ]);

        $user = User::factory()->create();
        $semester = Semester::factory()->for($user)->create();

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/timetable-imports', [
            'semester_id' => $semester->id,
            'url' => 'https://everytime.kr/@somecode',
        ]);

        $response->assertCreated();
        $payload = $response->json('payload');
        $this->assertCount(2, $payload);
        // Everytime's Tue(index 1, Mon=0) maps to our Sunday=0 week -> Tuesday=2.
        $this->assertSame(2, $payload[0]['day_of_week']);
        $this->assertSame('09:00', $payload[0]['start_time']);
        $this->assertSame('10:15', $payload[0]['end_time']);
        $this->assertSame('Logic Design', $payload[0]['title']);
        $this->assertSame('Room 301', $payload[0]['location']);
    }

    public function test_store_rejects_a_url_that_is_not_an_everytime_link(): void
    {
        $user = User::factory()->create();
        $semester = Semester::factory()->for($user)->create();

        $this->actingAs($user, 'sanctum')->postJson('/api/timetable-imports', [
            'semester_id' => $semester->id,
            'url' => 'https://example.com/@somecode',
        ])->assertStatus(422);
    }

    public function test_confirm_creates_courses_and_class_sessions_and_marks_import_confirmed(): void
    {
        $user = User::factory()->create();
        $semester = Semester::factory()->for($user)->create();
        $existingCourse = Course::factory()->for($user)->for($semester)->create(['title' => 'Existing Course']);
        $import = TimetableImport::factory()->for($user)->for($semester)->create();

        $response = $this->actingAs($user, 'sanctum')->postJson("/api/timetable-imports/{$import->id}/confirm", [
            'subjects' => [
                [
                    'title' => 'Existing Course',
                    'day_of_week' => 1,
                    'start_time' => '09:00',
                    'end_time' => '10:30',
                    'location' => 'Room 101',
                    'course_id' => $existingCourse->id,
                ],
                [
                    'title' => 'Brand New Course',
                    'day_of_week' => 3,
                    'start_time' => '14:00',
                    'end_time' => '15:30',
                    'location' => null,
                    'new_course' => ['title' => 'Brand New Course', 'colour' => '#2857A0'],
                ],
            ],
        ]);

        $response->assertOk()->assertJsonPath('status', 'confirmed');

        $this->assertDatabaseCount('class_sessions', 2);
        $this->assertDatabaseHas('class_sessions', [
            'course_id' => $existingCourse->id,
            'day_of_week' => 1,
            'location' => 'Room 101',
        ]);
        $newCourse = Course::where('title', 'Brand New Course')->first();
        $this->assertNotNull($newCourse);
        $this->assertDatabaseHas('class_sessions', [
            'course_id' => $newCourse->id,
            'day_of_week' => 3,
        ]);
        $this->assertSame('confirmed', $import->fresh()->status);
    }

    public function test_confirming_the_same_import_twice_does_not_duplicate_class_sessions(): void
    {
        $user = User::factory()->create();
        $semester = Semester::factory()->for($user)->create();
        $import = TimetableImport::factory()->for($user)->for($semester)->create();

        $subjects = [
            'subjects' => [
                [
                    'title' => 'Repeated Course',
                    'day_of_week' => 1,
                    'start_time' => '09:00',
                    'end_time' => '10:30',
                    'location' => 'Room 101',
                    'new_course' => ['title' => 'Repeated Course', 'colour' => '#2857A0'],
                ],
            ],
        ];

        $this->actingAs($user, 'sanctum')->postJson("/api/timetable-imports/{$import->id}/confirm", $subjects)->assertOk();
        // Re-importing the same link (a fresh draft, same subjects) must not create a second identical session.
        $secondImport = TimetableImport::factory()->for($user)->for($semester)->create();
        $this->actingAs($user, 'sanctum')->postJson("/api/timetable-imports/{$secondImport->id}/confirm", $subjects)->assertOk();

        $this->assertDatabaseCount('courses', 1);
        $this->assertDatabaseCount('class_sessions', 1);
    }

    public function test_discard_marks_the_import_discarded_without_creating_anything(): void
    {
        $user = User::factory()->create();
        $semester = Semester::factory()->for($user)->create();
        $import = TimetableImport::factory()->for($user)->for($semester)->create();

        $this->actingAs($user, 'sanctum')
            ->postJson("/api/timetable-imports/{$import->id}/discard")
            ->assertOk()
            ->assertJsonPath('status', 'discarded');

        $this->assertDatabaseCount('courses', 0);
        $this->assertDatabaseCount('class_sessions', 0);
    }

    public function test_a_user_cannot_confirm_another_users_import(): void
    {
        $owner = User::factory()->create();
        $intruder = User::factory()->create();
        $semester = Semester::factory()->for($owner)->create();
        $import = TimetableImport::factory()->for($owner)->for($semester)->create();

        $this->actingAs($intruder, 'sanctum')
            ->postJson("/api/timetable-imports/{$import->id}/confirm", ['subjects' => []])
            ->assertNotFound();
    }
}
