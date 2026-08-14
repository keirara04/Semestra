<?php

namespace Tests\Feature;

use App\Models\Course;
use App\Models\Material;
use App\Models\Semester;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class MaterialViewerTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
    }

    private function makePdfMaterial(User $user): Material
    {
        $semester = Semester::factory()->for($user)->create();
        $course = Course::factory()->for($user)->for($semester)->create();
        $file = UploadedFile::fake()->create('lecture.pdf', 100, 'application/pdf');
        $path = $file->store('materials/'.$user->id, 'public');

        return Material::factory()->for($user)->for($course)->create([
            'type' => 'pdf',
            'disk' => 'public',
            'path' => $path,
        ]);
    }

    public function test_view_url_returns_a_signed_url_and_touches_last_opened_at(): void
    {
        $user = User::factory()->create();
        $material = $this->makePdfMaterial($user);

        $response = $this->actingAs($user, 'sanctum')->getJson("/api/materials/{$material->id}/view-url");

        $response->assertOk();
        $this->assertStringContainsString('signature=', $response->json('url'));
        $this->assertDatabaseHas('user_material_states', [
            'user_id' => $user->id,
            'material_id' => $material->id,
        ]);
    }

    public function test_a_user_cannot_get_a_view_url_for_another_users_material(): void
    {
        $owner = User::factory()->create();
        $intruder = User::factory()->create();
        $material = $this->makePdfMaterial($owner);

        $this->actingAs($intruder, 'sanctum')
            ->getJson("/api/materials/{$material->id}/view-url")
            ->assertNotFound();
    }

    public function test_reading_position_can_be_saved_and_restored(): void
    {
        $user = User::factory()->create();
        $material = $this->makePdfMaterial($user);

        $this->actingAs($user, 'sanctum')->putJson("/api/materials/{$material->id}/state", [
            'last_page' => 7,
            'zoom' => 1.5,
        ])->assertOk();

        $response = $this->actingAs($user, 'sanctum')->getJson("/api/materials/{$material->id}/state");

        $response->assertOk()
            ->assertJsonPath('last_page', 7)
            ->assertJsonPath('zoom', '1.50');
    }
}
