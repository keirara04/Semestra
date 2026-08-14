<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthenticationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // CSRF verification is a browser/cookie concern (the Next.js client
        // fetches /sanctum/csrf-cookie first), not what these feature
        // tests are checking, so it's disabled here rather than faked.
        $this->withoutMiddleware(PreventRequestForgery::class);
    }

    public function test_a_user_can_register(): void
    {
        $response = $this->postJson('/register', [
            'name' => 'Keemi',
            'email' => 'keemi@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'timezone' => 'Asia/Kuala_Lumpur',
        ]);

        $response->assertCreated()
            ->assertJsonPath('email', 'keemi@example.com')
            ->assertJsonPath('timezone', 'Asia/Kuala_Lumpur');

        $this->assertAuthenticated();
        $this->assertDatabaseHas('users', ['email' => 'keemi@example.com']);
    }

    public function test_a_user_can_login_with_correct_credentials(): void
    {
        $user = User::factory()->create([
            'password' => bcrypt('password123'),
        ]);

        $response = $this->postJson('/login', [
            'email' => $user->email,
            'password' => 'password123',
        ]);

        $response->assertOk();
        $this->assertAuthenticatedAs($user);
    }

    public function test_login_fails_with_wrong_password(): void
    {
        $user = User::factory()->create([
            'password' => bcrypt('password123'),
        ]);

        $response = $this->postJson('/login', [
            'email' => $user->email,
            'password' => 'wrong-password',
        ]);

        $response->assertUnprocessable();
        $this->assertGuest();
    }

    public function test_an_authenticated_user_can_fetch_their_own_record(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->getJson('/api/user');

        $response->assertOk()->assertJsonPath('id', $user->id);
    }

    public function test_an_unauthenticated_request_to_api_user_is_rejected(): void
    {
        $response = $this->getJson('/api/user');

        $response->assertUnauthorized();
    }

    public function test_a_user_can_logout(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->postJson('/logout');

        $response->assertOk();
        $this->assertGuest('web');
    }
}
