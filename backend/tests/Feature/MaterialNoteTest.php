<?php

namespace Tests\Feature;

use App\Models\Course;
use App\Models\Material;
use App\Models\MaterialNote;
use App\Models\Semester;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MaterialNoteTest extends TestCase
{
    use RefreshDatabase;

    private function makeMaterial(User $user): Material
    {
        $semester = Semester::factory()->for($user)->create();
        $course = Course::factory()->for($user)->for($semester)->create();

        return Material::factory()->for($user)->for($course)->create(['type' => 'pdf']);
    }

    public function test_a_user_can_create_a_note_on_a_material(): void
    {
        $user = User::factory()->create();
        $material = $this->makeMaterial($user);

        $response = $this->actingAs($user, 'sanctum')->postJson("/api/materials/{$material->id}/notes", [
            'title' => 'Likely exam question',
            'content' => 'Explain amortized analysis.',
            'note_type' => 'exam',
            'page_number' => 4,
        ]);

        $response->assertCreated()->assertJsonPath('note_type', 'exam');
    }

    public function test_note_type_must_be_a_known_value(): void
    {
        $user = User::factory()->create();
        $material = $this->makeMaterial($user);

        $this->actingAs($user, 'sanctum')->postJson("/api/materials/{$material->id}/notes", [
            'title' => 'Bad type',
            'content' => 'content',
            'note_type' => 'not-a-real-type',
        ])->assertUnprocessable();
    }

    public function test_a_user_can_update_and_delete_their_note(): void
    {
        $user = User::factory()->create();
        $material = $this->makeMaterial($user);
        $note = MaterialNote::factory()->for($user)->for($material)->create();

        $this->actingAs($user, 'sanctum')->patchJson("/api/notes/{$note->id}", ['title' => 'Updated'])
            ->assertOk()->assertJsonPath('title', 'Updated');

        $this->actingAs($user, 'sanctum')->deleteJson("/api/notes/{$note->id}")->assertNoContent();
        $this->assertDatabaseMissing('material_notes', ['id' => $note->id]);
    }

    public function test_a_user_cannot_view_another_users_material_notes(): void
    {
        $owner = User::factory()->create();
        $intruder = User::factory()->create();
        $material = $this->makeMaterial($owner);

        $this->actingAs($intruder, 'sanctum')
            ->getJson("/api/materials/{$material->id}/notes")
            ->assertNotFound();
    }

    public function test_deleting_a_material_cascades_to_its_notes(): void
    {
        $user = User::factory()->create();
        $material = $this->makeMaterial($user);
        $note = MaterialNote::factory()->for($user)->for($material)->create();

        $this->actingAs($user, 'sanctum')->deleteJson("/api/materials/{$material->id}")->assertNoContent();

        $this->assertDatabaseMissing('material_notes', ['id' => $note->id]);
    }
}
