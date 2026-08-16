<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AiSettingsTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_user_can_enable_ai_consent(): void
    {
        $user = User::factory()->create(['ai_syllabus_extraction_consent_at' => null]);

        $response = $this->actingAs($user, 'sanctum')->patchJson('/api/ai/consent', ['enabled' => true]);

        $response->assertOk();
        $this->assertNotNull($response->json('ai_syllabus_extraction_consent_at'));
        $this->assertNotNull($user->fresh()->ai_syllabus_extraction_consent_at);
    }

    public function test_a_user_can_revoke_ai_consent(): void
    {
        $user = User::factory()->create(['ai_syllabus_extraction_consent_at' => now()]);

        $response = $this->actingAs($user, 'sanctum')->patchJson('/api/ai/consent', ['enabled' => false]);

        $response->assertOk();
        $this->assertNull($response->json('ai_syllabus_extraction_consent_at'));
        $this->assertNull($user->fresh()->ai_syllabus_extraction_consent_at);
    }

    public function test_enabled_must_be_a_boolean(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user, 'sanctum')->patchJson('/api/ai/consent', ['enabled' => 'yes'])
            ->assertStatus(422);
    }

    public function test_usage_reports_remaining_and_limit(): void
    {
        config(['services.openrouter.daily_request_limit' => 10]);
        $user = User::factory()->create();

        $response = $this->actingAs($user, 'sanctum')->getJson('/api/ai/usage');

        $response->assertOk()->assertJson(['remaining' => 10, 'limit' => 10]);
    }
}
