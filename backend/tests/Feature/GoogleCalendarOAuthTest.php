<?php

namespace Tests\Feature;

use App\Models\GoogleCalendarConnection;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Socialite\Contracts\User as SocialiteUserContract;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\InvalidStateException;
use Mockery;
use Tests\TestCase;

/**
 * Two testing gotchas drive how these are written:
 *
 * 1. Socialite::fake() doesn't work for this controller pair — its
 *    FakeProvider only intercepts the first call in a chain and forwards
 *    everything else straight to the real provider, and both controllers
 *    chain scopes()/with() before the call that would need faking.
 *    Mocking the driver directly avoids that gap.
 *
 * 2. withSession() seeds the container's session store directly, but the
 *    callback route force-attaches EncryptCookies+StartSession (see its
 *    comment in routes/api.php) so Socialite's own state-param check has
 *    a session to read even though it's outside auth:sanctum — and
 *    StartSession re-resolves the session by the request's cookie, which
 *    withSession() never set, silently resetting it back to empty. The
 *    realistic fix is the same thing a browser does: call /connect first
 *    (with a Referer that satisfies Sanctum's stateful-domain check, so
 *    its own session gets started) and let the test client's cookie jar
 *    carry that session into the /callback call, exactly like the two
 *    real requests a browser makes.
 */
class GoogleCalendarOAuthTest extends TestCase
{
    use RefreshDatabase;

    private function connect(User $user): void
    {
        $provider = Mockery::mock();
        $provider->shouldReceive('scopes')->once()->andReturnSelf();
        $provider->shouldReceive('with')->once()->andReturnSelf();
        $provider->shouldReceive('redirect')->once()->andReturn(redirect('https://accounts.google.com/o/oauth2/auth'));
        Socialite::shouldReceive('driver')->once()->with('google')->andReturn($provider);

        $this->actingAs($user, 'sanctum')
            ->withHeaders(['Referer' => 'http://localhost:3000/'])
            ->get('/api/google-calendar/connect')
            ->assertRedirect('https://accounts.google.com/o/oauth2/auth');
    }

    public function test_connect_stashes_the_user_id_in_session_and_redirects_to_google(): void
    {
        $this->connect(User::factory()->create());
    }

    public function test_callback_without_a_prior_connect_call_is_denied(): void
    {
        $response = $this->get('/api/google-calendar/callback');

        $response->assertRedirect();
        $this->assertStringContainsString('google_calendar=denied', $response->headers->get('Location'));
    }

    public function test_callback_reports_denied_when_google_returns_an_error(): void
    {
        $user = User::factory()->create();
        $this->connect($user);

        // No Socialite::user() call reaches the provider here — the
        // controller returns before that when ?error is present, so no
        // second mock expectation is set up.
        $response = $this->get('/api/google-calendar/callback?error=access_denied');

        $response->assertRedirect();
        $this->assertStringContainsString('google_calendar=denied', $response->headers->get('Location'));
    }

    public function test_callback_creates_a_connection_on_success(): void
    {
        $user = User::factory()->create();
        $this->connect($user);

        $socialiteUser = Mockery::mock(SocialiteUserContract::class);
        $socialiteUser->token = 'access-token';
        $socialiteUser->refreshToken = 'refresh-token';
        $socialiteUser->expiresIn = 3600;

        $provider = Mockery::mock();
        $provider->shouldReceive('scopes')->once()->andReturnSelf();
        $provider->shouldReceive('user')->once()->andReturn($socialiteUser);
        Socialite::shouldReceive('driver')->once()->with('google')->andReturn($provider);

        $response = $this->get('/api/google-calendar/callback');

        $response->assertRedirect();
        $this->assertStringContainsString('google_calendar=connected', $response->headers->get('Location'));
        $this->assertDatabaseHas('google_calendar_connections', ['user_id' => $user->id]);
        $this->assertSame('refresh-token', GoogleCalendarConnection::where('user_id', $user->id)->first()->refresh_token);
    }

    public function test_callback_without_a_refresh_token_reports_that_specifically(): void
    {
        $user = User::factory()->create();
        $this->connect($user);

        $socialiteUser = Mockery::mock(SocialiteUserContract::class);
        $socialiteUser->token = 'access-token';
        $socialiteUser->refreshToken = null;
        $socialiteUser->expiresIn = 3600;

        $provider = Mockery::mock();
        $provider->shouldReceive('scopes')->once()->andReturnSelf();
        $provider->shouldReceive('user')->once()->andReturn($socialiteUser);
        Socialite::shouldReceive('driver')->once()->with('google')->andReturn($provider);

        $response = $this->get('/api/google-calendar/callback');

        $this->assertStringContainsString('google_calendar=no_refresh_token', $response->headers->get('Location'));
        $this->assertDatabaseMissing('google_calendar_connections', ['user_id' => $user->id]);
    }

    public function test_callback_denies_an_invalid_state(): void
    {
        $user = User::factory()->create();
        $this->connect($user);

        $provider = Mockery::mock();
        $provider->shouldReceive('scopes')->once()->andReturnSelf();
        $provider->shouldReceive('user')->once()->andThrow(new InvalidStateException);
        Socialite::shouldReceive('driver')->once()->with('google')->andReturn($provider);

        $response = $this->get('/api/google-calendar/callback');

        $this->assertStringContainsString('google_calendar=denied', $response->headers->get('Location'));
    }

    public function test_callback_reports_a_generic_provider_failure(): void
    {
        $user = User::factory()->create();
        $this->connect($user);

        $provider = Mockery::mock();
        $provider->shouldReceive('scopes')->once()->andReturnSelf();
        $provider->shouldReceive('user')->once()->andThrow(new \RuntimeException('guzzle exploded'));
        Socialite::shouldReceive('driver')->once()->with('google')->andReturn($provider);

        $response = $this->get('/api/google-calendar/callback');

        $this->assertStringContainsString('google_calendar=error', $response->headers->get('Location'));
    }
}
