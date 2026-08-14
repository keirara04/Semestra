<?php

namespace Tests\Feature;

use App\Models\Course;
use App\Models\Material;
use App\Models\MaterialAnnotation;
use App\Models\Semester;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class AnnotationSyncTest extends TestCase
{
    use RefreshDatabase;

    private function makeMaterial(User $user): Material
    {
        $semester = Semester::factory()->for($user)->create();
        $course = Course::factory()->for($user)->for($semester)->create();

        return Material::factory()->for($user)->for($course)->create(['type' => 'pdf']);
    }

    public function test_upsert_creates_a_new_annotation_keyed_by_client_uuid(): void
    {
        $user = User::factory()->create();
        $material = $this->makeMaterial($user);
        $uuid = (string) Str::uuid();

        $response = $this->actingAs($user, 'sanctum')->putJson("/api/materials/{$material->id}/annotations", [
            'upsert' => [[
                'id' => $uuid,
                'page_number' => 3,
                'type' => 'highlight',
                'data' => ['x' => 0.1, 'y' => 0.2, 'width' => 0.3, 'height' => 0.02],
            ]],
        ]);

        $response->assertOk()->assertJsonPath('synced.0.id', $uuid);
        $this->assertDatabaseHas('material_annotations', [
            'client_uuid' => $uuid,
            'material_id' => $material->id,
            'user_id' => $user->id,
            'page_number' => 3,
        ]);
    }

    public function test_upsert_with_the_same_client_uuid_updates_in_place_not_duplicates(): void
    {
        $user = User::factory()->create();
        $material = $this->makeMaterial($user);
        $uuid = (string) Str::uuid();

        $this->actingAs($user, 'sanctum')->putJson("/api/materials/{$material->id}/annotations", [
            'upsert' => [['id' => $uuid, 'page_number' => 1, 'type' => 'highlight', 'data' => ['x' => 0.1]]],
        ])->assertOk();

        $this->actingAs($user, 'sanctum')->putJson("/api/materials/{$material->id}/annotations", [
            'upsert' => [['id' => $uuid, 'page_number' => 1, 'type' => 'highlight', 'data' => ['x' => 0.5]]],
        ])->assertOk();

        $this->assertDatabaseCount('material_annotations', 1);
        $this->assertSame(0.5, MaterialAnnotation::where('client_uuid', $uuid)->first()->data['x']);
    }

    public function test_delete_soft_deletes_and_excludes_from_index(): void
    {
        $user = User::factory()->create();
        $material = $this->makeMaterial($user);
        $annotation = MaterialAnnotation::factory()->for($user)->for($material)->create();

        $this->actingAs($user, 'sanctum')->putJson("/api/materials/{$material->id}/annotations", [
            'delete' => [$annotation->client_uuid],
        ])->assertOk();

        $this->assertDatabaseHas('material_annotations', ['id' => $annotation->id]);
        $this->assertNotNull($annotation->fresh()->deleted_at);

        $this->actingAs($user, 'sanctum')
            ->getJson("/api/materials/{$material->id}/annotations")
            ->assertOk()
            ->assertJsonCount(0);
    }

    public function test_a_stale_updated_at_on_upsert_returns_a_conflict(): void
    {
        $user = User::factory()->create();
        $material = $this->makeMaterial($user);
        $annotation = MaterialAnnotation::factory()->for($user)->for($material)->create();

        $this->actingAs($user, 'sanctum')->putJson("/api/materials/{$material->id}/annotations", [
            'upsert' => [[
                'id' => $annotation->client_uuid,
                'page_number' => 1,
                'type' => 'highlight',
                'data' => ['x' => 0.9],
                'updated_at' => now()->subDay()->toIso8601String(),
            ]],
        ])->assertStatus(409);
    }

    public function test_a_user_cannot_sync_annotations_for_another_users_material(): void
    {
        $owner = User::factory()->create();
        $intruder = User::factory()->create();
        $material = $this->makeMaterial($owner);

        $this->actingAs($intruder, 'sanctum')->putJson("/api/materials/{$material->id}/annotations", [
            'upsert' => [['id' => (string) Str::uuid(), 'page_number' => 1, 'type' => 'highlight', 'data' => ['x' => 0.1]]],
        ])->assertNotFound();
    }
}
