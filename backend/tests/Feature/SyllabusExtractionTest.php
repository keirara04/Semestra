<?php

namespace Tests\Feature;

use App\Models\Course;
use App\Models\Material;
use App\Models\Semester;
use App\Models\SyllabusDraft;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class SyllabusExtractionTest extends TestCase
{
    use RefreshDatabase;

    private function fakeExtractionResponse(): array
    {
        return [
            'assessments' => [
                [
                    'title' => 'Lab Report',
                    'type' => 'report',
                    'due_date' => '2026-09-20',
                    'source_fragment' => 'Lab Report due 2026-09-20, 20% weighting',
                    'confidence' => 'high',
                ],
            ],
            'tasks' => [],
        ];
    }

    public function test_extraction_is_blocked_without_consent(): void
    {
        $user = User::factory()->create(['timezone' => 'UTC']);
        $semester = Semester::factory()->for($user)->create();
        $course = Course::factory()->for($user)->for($semester)->create();

        $this->actingAs($user, 'sanctum')
            ->postJson("/api/courses/{$course->id}/syllabus-drafts", ['pasted_text' => 'Lab Report due 2026-09-20.'])
            ->assertStatus(403);
    }

    public function test_extraction_creates_a_pending_draft_from_pasted_text(): void
    {
        Http::fake([
            'openrouter.ai/*' => Http::response([
                'model' => 'openai/gpt-4o-mini',
                'choices' => [['message' => ['content' => json_encode($this->fakeExtractionResponse())]]],
                'usage' => ['total_tokens' => 200],
            ]),
        ]);

        $user = User::factory()->create(['timezone' => 'UTC', 'ai_syllabus_extraction_consent_at' => now()]);
        $semester = Semester::factory()->for($user)->create();
        $course = Course::factory()->for($user)->for($semester)->create();

        $response = $this->actingAs($user, 'sanctum')
            ->postJson("/api/courses/{$course->id}/syllabus-drafts", ['pasted_text' => 'Lab Report due 2026-09-20, 20% weighting.']);

        $response->assertCreated()
            ->assertJsonPath('status', 'pending')
            ->assertJsonPath('candidates.assessments.0.title', 'Lab Report');

        $this->assertDatabaseHas('ai_interactions', ['user_id' => $user->id, 'status' => 'succeeded']);
        $this->assertDatabaseHas('ai_usages', ['user_id' => $user->id, 'requests_count' => 1]);
    }

    public function test_extraction_reads_text_from_an_uploaded_pdf_material(): void
    {
        Http::fake(function ($request) {
            $this->assertStringContainsString('Lab Report due 2026-09-20', $request->data()['messages'][1]['content']);

            return Http::response([
                'model' => 'openai/gpt-4o-mini',
                'choices' => [['message' => ['content' => json_encode($this->fakeExtractionResponse())]]],
                'usage' => ['total_tokens' => 200],
            ]);
        });

        Storage::fake('public');
        $fixture = base_path('tests/Fixtures/sample-syllabus.pdf');
        Storage::disk('public')->put('materials/syllabus.pdf', file_get_contents($fixture));

        $user = User::factory()->create(['timezone' => 'UTC', 'ai_syllabus_extraction_consent_at' => now()]);
        $semester = Semester::factory()->for($user)->create();
        $course = Course::factory()->for($user)->for($semester)->create();
        $material = Material::factory()->for($user)->for($course)->create([
            'type' => 'pdf',
            'disk' => 'public',
            'path' => 'materials/syllabus.pdf',
            'mime_type' => 'application/pdf',
        ]);

        $this->actingAs($user, 'sanctum')
            ->postJson("/api/courses/{$course->id}/syllabus-drafts", ['material_id' => $material->id])
            ->assertCreated();
    }

    public function test_extraction_is_blocked_once_the_daily_budget_is_spent(): void
    {
        config(['services.openrouter.daily_request_limit' => 0]);

        $user = User::factory()->create(['timezone' => 'UTC', 'ai_syllabus_extraction_consent_at' => now()]);
        $semester = Semester::factory()->for($user)->create();
        $course = Course::factory()->for($user)->for($semester)->create();

        $this->actingAs($user, 'sanctum')
            ->postJson("/api/courses/{$course->id}/syllabus-drafts", ['pasted_text' => 'Lab Report due 2026-09-20.'])
            ->assertStatus(429);

        $this->assertDatabaseHas('ai_interactions', ['user_id' => $user->id, 'status' => 'budget_exceeded']);
    }

    public function test_confirming_a_draft_creates_only_the_selected_assessments_and_tasks(): void
    {
        $user = User::factory()->create(['timezone' => 'UTC', 'ai_syllabus_extraction_consent_at' => now()]);
        $semester = Semester::factory()->for($user)->create();
        $course = Course::factory()->for($user)->for($semester)->create();
        $draft = SyllabusDraft::factory()->for($user)->for($course)->create([
            'candidates' => $this->fakeExtractionResponse(),
            'status' => 'pending',
        ]);

        $response = $this->actingAs($user, 'sanctum')->postJson("/api/syllabus-drafts/{$draft->id}/confirm", [
            'assessments' => [
                ['title' => 'Lab Report', 'type' => 'report', 'due_at' => '2026-09-20'],
            ],
            'tasks' => [
                ['title' => 'Draft the report', 'estimated_minutes' => 90, 'assessment_index' => 0],
            ],
        ]);

        $response->assertOk()->assertJsonPath('status', 'confirmed');
        $this->assertDatabaseHas('assessments', ['course_id' => $course->id, 'title' => 'Lab Report']);
        $this->assertDatabaseHas('tasks', ['course_id' => $course->id, 'title' => 'Draft the report', 'estimated_minutes' => 90]);
    }

    public function test_discarding_a_draft_creates_nothing(): void
    {
        $user = User::factory()->create(['timezone' => 'UTC']);
        $semester = Semester::factory()->for($user)->create();
        $course = Course::factory()->for($user)->for($semester)->create();
        $draft = SyllabusDraft::factory()->for($user)->for($course)->create();

        $this->actingAs($user, 'sanctum')->postJson("/api/syllabus-drafts/{$draft->id}/discard")
            ->assertOk()->assertJsonPath('status', 'discarded');

        $this->assertDatabaseCount('assessments', 0);
    }

    public function test_a_user_cannot_confirm_another_users_draft(): void
    {
        $owner = User::factory()->create(['timezone' => 'UTC']);
        $semester = Semester::factory()->for($owner)->create();
        $course = Course::factory()->for($owner)->for($semester)->create();
        $draft = SyllabusDraft::factory()->for($owner)->for($course)->create();

        $intruder = User::factory()->create(['timezone' => 'UTC']);

        $this->actingAs($intruder, 'sanctum')->postJson("/api/syllabus-drafts/{$draft->id}/discard")
            ->assertStatus(404);
    }
}
