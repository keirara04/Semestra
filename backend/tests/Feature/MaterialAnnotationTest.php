<?php

namespace Tests\Feature;

use App\Models\Course;
use App\Models\Material;
use App\Models\MaterialAnnotation;
use App\Models\Semester;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MaterialAnnotationTest extends TestCase
{
    use RefreshDatabase;

    public function test_index_returns_annotations_for_the_material(): void
    {
        $user = User::factory()->create();
        $semester = Semester::factory()->for($user)->create();
        $course = Course::factory()->for($user)->for($semester)->create();
        $material = Material::factory()->for($user)->for($course)->create(['type' => 'pdf']);
        MaterialAnnotation::factory()->for($user)->for($material)->create();

        $response = $this->actingAs($user, 'sanctum')->getJson("/api/materials/{$material->id}/annotations");

        $response->assertOk()->assertJsonCount(1);
    }

    public function test_index_excludes_soft_deleted_annotations(): void
    {
        $user = User::factory()->create();
        $semester = Semester::factory()->for($user)->create();
        $course = Course::factory()->for($user)->for($semester)->create();
        $material = Material::factory()->for($user)->for($course)->create(['type' => 'pdf']);
        MaterialAnnotation::factory()->for($user)->for($material)->create(['deleted_at' => now()]);

        $response = $this->actingAs($user, 'sanctum')->getJson("/api/materials/{$material->id}/annotations");

        $response->assertOk()->assertJsonCount(0);
    }

    public function test_a_user_cannot_view_another_users_material_annotations(): void
    {
        $owner = User::factory()->create();
        $intruder = User::factory()->create();
        $semester = Semester::factory()->for($owner)->create();
        $course = Course::factory()->for($owner)->for($semester)->create();
        $material = Material::factory()->for($owner)->for($course)->create(['type' => 'pdf']);

        $this->actingAs($intruder, 'sanctum')
            ->getJson("/api/materials/{$material->id}/annotations")
            ->assertNotFound();
    }

    public function test_deleting_a_material_cascades_to_its_annotations(): void
    {
        $user = User::factory()->create();
        $semester = Semester::factory()->for($user)->create();
        $course = Course::factory()->for($user)->for($semester)->create();
        $material = Material::factory()->for($user)->for($course)->create(['type' => 'pdf']);
        $annotation = MaterialAnnotation::factory()->for($user)->for($material)->create();

        $this->actingAs($user, 'sanctum')->deleteJson("/api/materials/{$material->id}")->assertNoContent();

        $this->assertDatabaseMissing('material_annotations', ['id' => $annotation->id]);
    }
}
