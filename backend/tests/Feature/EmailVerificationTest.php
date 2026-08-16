<?php

namespace Tests\Feature;

use App\Jobs\SendVerificationEmail;
use App\Models\User;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\URL;
use Tests\TestCase;

class EmailVerificationTest extends TestCase
{
    use RefreshDatabase;

    public function test_registration_dispatches_exactly_one_verification_email(): void
    {
        // See AuthenticationTest: CSRF is a browser/cookie concern, not
        // what this test is checking.
        $this->withoutMiddleware(PreventRequestForgery::class);
        Queue::fake();

        $response = $this->postJson('/register', [
            'name' => 'New Student',
            'email' => 'newstudent@example.com',
            'password' => 'CorrectHorse123!',
            'password_confirmation' => 'CorrectHorse123!',
        ]);

        $response->assertCreated();
        $user = User::where('email', 'newstudent@example.com')->first();
        $this->assertNull($user->email_verified_at);

        Queue::assertPushed(SendVerificationEmail::class, 1);
    }

    public function test_a_valid_signed_link_verifies_signup(): void
    {
        $user = User::factory()->unverified()->create();

        $url = URL::temporarySignedRoute('email.verify', now()->addMinutes(60), [
            'user' => $user->id,
            'hash' => sha1($user->email),
        ]);

        $response = $this->get($url);

        $response->assertRedirect();
        $this->assertStringContainsString('email=verified', $response->headers->get('Location'));
        $this->assertNotNull($user->fresh()->email_verified_at);
    }

    public function test_verification_is_idempotent_on_a_second_click(): void
    {
        $user = User::factory()->create(); // already verified by the factory default

        $url = URL::temporarySignedRoute('email.verify', now()->addMinutes(60), [
            'user' => $user->id,
            'hash' => sha1($user->email),
        ]);

        $response = $this->get($url);

        $response->assertRedirect();
        $this->assertStringContainsString('email=verified', $response->headers->get('Location'));
    }

    public function test_a_tampered_hash_is_rejected(): void
    {
        $user = User::factory()->unverified()->create();

        $url = URL::temporarySignedRoute('email.verify', now()->addMinutes(60), [
            'user' => $user->id,
            'hash' => sha1('someone-elses-address@example.com'),
        ]);

        $response = $this->get($url);

        $response->assertRedirect();
        $this->assertStringContainsString('email=invalid', $response->headers->get('Location'));
        $this->assertNull($user->fresh()->email_verified_at);
    }

    public function test_a_tampered_signature_is_rejected_by_the_signed_middleware(): void
    {
        $user = User::factory()->unverified()->create();

        $url = URL::temporarySignedRoute('email.verify', now()->addMinutes(60), [
            'user' => $user->id,
            'hash' => sha1($user->email),
        ]);

        $response = $this->get($url.'-tampered');

        $response->assertForbidden();
    }

    public function test_an_expired_link_is_rejected(): void
    {
        $user = User::factory()->unverified()->create();

        $url = URL::temporarySignedRoute('email.verify', now()->subMinutes(1), [
            'user' => $user->id,
            'hash' => sha1($user->email),
        ]);

        $response = $this->get($url);

        $response->assertForbidden();
    }

    public function test_pending_email_confirmation_promotes_the_address(): void
    {
        $user = User::factory()->create(['email' => 'old@example.com']);
        $user->pending_email = 'new@example.com';
        $user->save();

        $url = URL::temporarySignedRoute('email.verify', now()->addMinutes(60), [
            'user' => $user->id,
            'hash' => sha1('new@example.com'),
        ]);

        $response = $this->get($url);

        $response->assertRedirect();
        $this->assertStringContainsString('email=verified', $response->headers->get('Location'));

        $user->refresh();
        $this->assertSame('new@example.com', $user->email);
        $this->assertNull($user->pending_email);
        $this->assertNotNull($user->email_verified_at);
    }

    public function test_pending_email_confirmation_fails_gracefully_if_the_address_was_claimed_meanwhile(): void
    {
        $user = User::factory()->create(['email' => 'old@example.com']);
        $user->pending_email = 'new@example.com';
        $user->save();

        // A different account independently takes the address in the
        // interim (e.g. registers fresh with it) — the pending_email
        // unique constraint alone can't catch this.
        User::factory()->create(['email' => 'new@example.com']);

        $url = URL::temporarySignedRoute('email.verify', now()->addMinutes(60), [
            'user' => $user->id,
            'hash' => sha1('new@example.com'),
        ]);

        $response = $this->get($url);

        $response->assertRedirect();
        $this->assertStringContainsString('email=taken', $response->headers->get('Location'));

        $user->refresh();
        $this->assertSame('old@example.com', $user->email);
    }

    public function test_a_stale_link_dies_after_a_second_email_change_request(): void
    {
        $user = User::factory()->create(['email' => 'old@example.com']);
        $user->pending_email = 'first-attempt@example.com';
        $user->save();

        $staleUrl = URL::temporarySignedRoute('email.verify', now()->addMinutes(60), [
            'user' => $user->id,
            'hash' => sha1('first-attempt@example.com'),
        ]);

        // User changes their mind and requests a different address before
        // clicking the first link.
        $user->pending_email = 'second-attempt@example.com';
        $user->save();

        $response = $this->get($staleUrl);

        $response->assertRedirect();
        $this->assertStringContainsString('email=invalid', $response->headers->get('Location'));
        $this->assertSame('second-attempt@example.com', $user->fresh()->pending_email);
    }

    public function test_resend_is_throttled(): void
    {
        // The `array` cache store (see phpunit.xml) persists for the
        // whole PHPUnit process, not per-test — flush it so an earlier
        // test's throttle hits on this same route can't leak in here.
        \Illuminate\Support\Facades\Cache::flush();
        $user = User::factory()->unverified()->create();

        for ($i = 0; $i < 6; $i++) {
            $this->actingAs($user, 'sanctum')->postJson('/api/email/verification/resend')->assertNoContent();
        }

        $this->actingAs($user, 'sanctum')->postJson('/api/email/verification/resend')
            ->assertStatus(429);
    }

    public function test_notification_email_is_skipped_for_an_unverified_recipient(): void
    {
        Mail::fake();
        $user = User::factory()->unverified()->create();
        // user_id isn't mass-assignable on Notification — BelongsToUser
        // sets it from Auth::user() at creation time, hence forceCreate
        // with an explicit user_id rather than the (unauthenticated)
        // mass-assignment path.
        $notification = \App\Models\Notification::forceCreate([
            'user_id' => $user->id,
            'type' => 'tomorrow_overloaded',
            'idempotency_key' => 'test-key-'.uniqid(),
            'message' => 'Tomorrow has 8h planned.',
        ]);

        (new \App\Jobs\SendNotificationEmail($notification->id))->handle();

        $this->assertSame('skipped', $notification->fresh()->status);
        Mail::assertNothingSent();
    }
}
