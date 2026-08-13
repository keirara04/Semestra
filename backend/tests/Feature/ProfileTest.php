<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProfileTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_user_can_update_their_profile_settings(): void
    {
        $user = User::factory()->create(['max_study_hours_per_day' => 6]);

        $response = $this->actingAs($user, 'sanctum')->patchJson('/api/user', [
            'max_study_hours_per_day' => 4,
            'timezone' => 'America/New_York',
            'grade_scale' => '4.3',
            'deep_work_windows' => [['start' => '14:00', 'end' => '17:00']],
            'quiet_hours' => ['start' => '22:00', 'end' => '07:00'],
        ]);

        $response->assertOk()
            ->assertJsonPath('max_study_hours_per_day', 4)
            ->assertJsonPath('timezone', 'America/New_York')
            ->assertJsonPath('grade_scale', '4.3');

        $user->refresh();
        $this->assertSame([['start' => '14:00', 'end' => '17:00']], $user->deep_work_windows);
    }

    public function test_deep_work_window_end_must_be_after_start(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user, 'sanctum')->patchJson('/api/user', [
            'deep_work_windows' => [['start' => '17:00', 'end' => '14:00']],
        ]);

        $response->assertUnprocessable();
    }

    public function test_a_user_can_delete_their_account_with_correct_password(): void
    {
        $user = User::factory()->create(['password' => 'correct-password']);

        $response = $this->actingAs($user, 'sanctum')->deleteJson('/api/user', [
            'password' => 'correct-password',
        ]);

        $response->assertNoContent();
        $this->assertDatabaseMissing('users', ['id' => $user->id]);
    }

    public function test_account_deletion_requires_the_correct_password(): void
    {
        $user = User::factory()->create(['password' => 'correct-password']);

        $response = $this->actingAs($user, 'sanctum')->deleteJson('/api/user', [
            'password' => 'wrong-password',
        ]);

        $response->assertUnprocessable();
        $this->assertDatabaseHas('users', ['id' => $user->id]);
    }
}
