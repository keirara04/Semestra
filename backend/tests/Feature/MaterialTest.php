<?php

namespace Tests\Feature;

use App\Models\Assessment;
use App\Models\Course;
use App\Models\Material;
use App\Models\Semester;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class MaterialTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
    }

    public function test_a_user_can_upload_a_file_material(): void
    {
        $user = User::factory()->create();
        $semester = Semester::factory()->for($user)->create();
        $course = Course::factory()->for($user)->for($semester)->create();

        $response = $this->actingAs($user, 'sanctum')->post('/api/materials', [
            'course_id' => $course->id,
            'type' => 'slide',
            'title' => 'Week 3 slides',
            'week' => 3,
            'file' => UploadedFile::fake()->create('slides.pdf', 500, 'application/pdf'),
        ]);

        $response->assertCreated()
            ->assertJsonPath('title', 'Week 3 slides')
            ->assertJsonPath('mime_type', 'application/pdf');

        $material = Material::first();
        Storage::disk('public')->assertExists($material->path);
    }

    public function test_a_user_can_add_a_link_material_without_a_file(): void
    {
        $user = User::factory()->create();
        $semester = Semester::factory()->for($user)->create();
        $course = Course::factory()->for($user)->for($semester)->create();

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/materials', [
            'course_id' => $course->id,
            'type' => 'link',
            'title' => 'Extra reading',
            'url' => 'https://example.com/reading',
        ]);

        $response->assertCreated()->assertJsonPath('url', 'https://example.com/reading');
    }

    public function test_a_material_without_a_file_or_url_is_rejected(): void
    {
        $user = User::factory()->create();
        $semester = Semester::factory()->for($user)->create();
        $course = Course::factory()->for($user)->for($semester)->create();

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/materials', [
            'course_id' => $course->id,
            'type' => 'reading',
            'title' => 'Nothing attached',
        ]);

        $response->assertUnprocessable();
    }

    public function test_deleting_a_material_removes_its_uploaded_file(): void
    {
        $user = User::factory()->create();
        $semester = Semester::factory()->for($user)->create();
        $course = Course::factory()->for($user)->for($semester)->create();

        $created = $this->actingAs($user, 'sanctum')->post('/api/materials', [
            'course_id' => $course->id,
            'type' => 'pdf',
            'title' => 'Notes',
            'file' => UploadedFile::fake()->create('notes.pdf', 100),
        ])->json();

        $path = $created['path'];
        Storage::disk('public')->assertExists($path);

        $this->actingAs($user, 'sanctum')->deleteJson("/api/materials/{$created['id']}")->assertNoContent();

        Storage::disk('public')->assertMissing($path);
    }

    public function test_a_material_can_be_tagged_to_assessments(): void
    {
        $user = User::factory()->create();
        $semester = Semester::factory()->for($user)->create();
        $course = Course::factory()->for($user)->for($semester)->create();
        $assessment = Assessment::factory()->for($user)->for($course)->create();

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/materials', [
            'course_id' => $course->id,
            'type' => 'link',
            'title' => 'Rubric',
            'url' => 'https://example.com/rubric',
            'assessment_ids' => [$assessment->id],
        ]);

        $response->assertCreated();
        $this->assertDatabaseHas('assessment_material', [
            'assessment_id' => $assessment->id,
            'material_id' => $response->json('id'),
        ]);
    }

    public function test_a_user_cannot_view_another_users_material(): void
    {
        $owner = User::factory()->create();
        $intruder = User::factory()->create();
        $semester = Semester::factory()->for($owner)->create();
        $course = Course::factory()->for($owner)->for($semester)->create();
        $material = Material::factory()->for($owner)->for($course)->create();

        $this->actingAs($intruder, 'sanctum')
            ->getJson("/api/materials/{$material->id}")
            ->assertNotFound();
    }
}
