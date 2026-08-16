<?php

namespace Tests\Feature;

use App\Jobs\SendVerificationEmail;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Queue;
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

    public function test_a_user_can_update_their_name(): void
    {
        $user = User::factory()->create(['name' => 'Old Name']);

        $response = $this->actingAs($user, 'sanctum')->patchJson('/api/user', [
            'name' => 'New Name',
        ]);

        $response->assertOk()->assertJsonPath('name', 'New Name');
    }

    public function test_preference_only_save_does_not_require_current_password(): void
    {
        // Regression guard for the endpoint split: /api/user must stay a
        // no-re-auth route even though /api/user/email and
        // /api/user/password (the same controller) now require one.
        $user = User::factory()->create();

        $response = $this->actingAs($user, 'sanctum')->patchJson('/api/user', [
            'grade_scale' => '4.0',
        ]);

        $response->assertOk();
    }

    public function test_a_user_can_change_their_password(): void
    {
        $user = User::factory()->create(['password' => 'OldPassword123!', 'remember_token' => 'stale-token']);

        $response = $this->actingAs($user, 'sanctum')->patchJson('/api/user/password', [
            'current_password' => 'OldPassword123!',
            'password' => 'NewPassword456!',
            'password_confirmation' => 'NewPassword456!',
        ]);

        $response->assertOk();
        $user->refresh();
        $this->assertTrue(Hash::check('NewPassword456!', $user->password));
        $this->assertFalse(Hash::check('OldPassword123!', $user->password));
        $this->assertNotSame('stale-token', $user->remember_token);
    }

    public function test_password_change_rejects_wrong_current_password(): void
    {
        $user = User::factory()->create(['password' => 'OldPassword123!']);

        $response = $this->actingAs($user, 'sanctum')->patchJson('/api/user/password', [
            'current_password' => 'wrong-password',
            'password' => 'NewPassword456!',
            'password_confirmation' => 'NewPassword456!',
        ]);

        $response->assertUnprocessable()->assertJsonValidationErrors('current_password');
    }

    public function test_password_change_rejects_mismatched_confirmation(): void
    {
        $user = User::factory()->create(['password' => 'OldPassword123!']);

        $response = $this->actingAs($user, 'sanctum')->patchJson('/api/user/password', [
            'current_password' => 'OldPassword123!',
            'password' => 'NewPassword456!',
            'password_confirmation' => 'DoesNotMatch!',
        ]);

        $response->assertUnprocessable()->assertJsonValidationErrors('password');
    }

    public function test_password_change_rejects_same_password(): void
    {
        $user = User::factory()->create(['password' => 'OldPassword123!']);

        $response = $this->actingAs($user, 'sanctum')->patchJson('/api/user/password', [
            'current_password' => 'OldPassword123!',
            'password' => 'OldPassword123!',
            'password_confirmation' => 'OldPassword123!',
        ]);

        $response->assertUnprocessable()->assertJsonValidationErrors('password');
    }

    public function test_a_user_can_request_an_email_change(): void
    {
        // Queue::fake() rather than an end-to-end Mail assertion: this
        // dev environment's QUEUE_CONNECTION is redis even under
        // phpunit's `sync` env override (a real job would sit unrun on
        // a real queue during the test), so the job dispatch itself —
        // with the right target address — is what's actually checkable
        // here. SendVerificationEmail's own delivery is covered directly
        // in EmailVerificationTest.
        Queue::fake();
        $user = User::factory()->create(['email' => 'old@example.com', 'password' => 'correct-password']);

        $response = $this->actingAs($user, 'sanctum')->patchJson('/api/user/email', [
            'email' => 'new@example.com',
            'current_password' => 'correct-password',
        ]);

        $response->assertOk()->assertJsonPath('pending_email', 'new@example.com');

        $user->refresh();
        $this->assertSame('old@example.com', $user->email);
        $this->assertSame('new@example.com', $user->pending_email);
        Queue::assertPushed(
            SendVerificationEmail::class,
            fn ($job) => $job->targetEmail === 'new@example.com',
        );
    }

    public function test_email_change_rejects_wrong_current_password(): void
    {
        $user = User::factory()->create(['password' => 'correct-password']);

        $response = $this->actingAs($user, 'sanctum')->patchJson('/api/user/email', [
            'email' => 'new@example.com',
            'current_password' => 'wrong-password',
        ]);

        $response->assertUnprocessable()->assertJsonValidationErrors('current_password');
    }

    public function test_email_change_rejects_another_users_address(): void
    {
        User::factory()->create(['email' => 'taken@example.com']);
        $user = User::factory()->create(['password' => 'correct-password']);

        $response = $this->actingAs($user, 'sanctum')->patchJson('/api/user/email', [
            'email' => 'taken@example.com',
            'current_password' => 'correct-password',
        ]);

        $response->assertUnprocessable()->assertJsonValidationErrors('email');
    }

    public function test_email_change_accepts_the_users_own_unchanged_address(): void
    {
        // Regression guard for the Rule::unique(...)->ignore() clause.
        $user = User::factory()->create(['email' => 'me@example.com', 'password' => 'correct-password']);

        $response = $this->actingAs($user, 'sanctum')->patchJson('/api/user/email', [
            'email' => 'me@example.com',
            'current_password' => 'correct-password',
        ]);

        $response->assertOk();
    }

    public function test_a_user_can_cancel_a_pending_email_change(): void
    {
        // pending_email is deliberately not mass-assignable (see the
        // migration's docblock), so it's set directly here, not via
        // the factory's create([...]).
        $user = User::factory()->create();
        $user->pending_email = 'new@example.com';
        $user->save();

        $response = $this->actingAs($user, 'sanctum')->deleteJson('/api/user/email');

        $response->assertOk()->assertJsonPath('pending_email', null);
        $this->assertNull($user->fresh()->pending_email);
    }
}
