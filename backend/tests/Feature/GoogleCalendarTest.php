<?php

namespace Tests\Feature;

use App\Models\CalendarBlock;
use App\Models\GoogleCalendarConnection;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class GoogleCalendarTest extends TestCase
{
    use RefreshDatabase;

    public function test_status_reports_disconnected_when_no_connection_exists(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user, 'sanctum')->getJson('/api/google-calendar/status');

        $response->assertOk()->assertJson(['connected' => false, 'lastSyncedAt' => null]);
    }

    public function test_status_reports_connected_with_last_synced_at(): void
    {
        $user = User::factory()->create();
        GoogleCalendarConnection::factory()->for($user)->create(['last_synced_at' => now()]);

        $response = $this->actingAs($user, 'sanctum')->getJson('/api/google-calendar/status');

        $response->assertOk()->assertJson(['connected' => true]);
        $this->assertNotNull($response->json('lastSyncedAt'));
    }

    public function test_sync_pulls_events_into_calendar_blocks(): void
    {
        Http::fake([
            'www.googleapis.com/calendar/v3/*' => Http::response([
                'items' => [
                    [
                        'id' => 'evt-1',
                        'summary' => 'Study group',
                        'location' => 'Library',
                        'start' => ['dateTime' => '2026-09-10T10:00:00Z'],
                        'end' => ['dateTime' => '2026-09-10T11:00:00Z'],
                    ],
                ],
                'nextSyncToken' => 'sync-token-abc',
            ]),
        ]);

        $user = User::factory()->create();
        GoogleCalendarConnection::factory()->for($user)->create();

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/google-calendar/sync');

        $response->assertOk()->assertJson(['synced' => 1]);
        $this->assertDatabaseHas('calendar_blocks', [
            'user_id' => $user->id,
            'source' => 'google',
            'external_id' => 'evt-1',
            'title' => 'Study group',
        ]);
        $this->assertSame('sync-token-abc', GoogleCalendarConnection::where('user_id', $user->id)->value('sync_token'));
    }

    public function test_sync_is_a_no_op_without_a_connection(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/google-calendar/sync');

        $response->assertOk()->assertJson(['synced' => 0]);
    }

    public function test_sync_refreshes_an_expired_access_token_before_calling_the_api(): void
    {
        Http::fake([
            'oauth2.googleapis.com/token' => Http::response([
                'access_token' => 'new-access-token',
                'expires_in' => 3600,
            ]),
            'www.googleapis.com/calendar/v3/*' => Http::response([
                'items' => [],
                'nextSyncToken' => 'token-2',
            ]),
        ]);

        $user = User::factory()->create();
        GoogleCalendarConnection::factory()->for($user)->expired()->create();

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/google-calendar/sync');

        $response->assertOk();
        Http::assertSent(fn ($request) => $request->url() === 'https://oauth2.googleapis.com/token');
        $this->assertSame('new-access-token', GoogleCalendarConnection::where('user_id', $user->id)->value('access_token'));
    }

    public function test_a_cancelled_pulled_event_removes_its_calendar_block(): void
    {
        Http::fake([
            'www.googleapis.com/calendar/v3/*' => Http::response([
                'items' => [['id' => 'evt-1', 'status' => 'cancelled']],
                'nextSyncToken' => 'token-3',
            ]),
        ]);

        $user = User::factory()->create();
        GoogleCalendarConnection::factory()->for($user)->create();
        CalendarBlock::factory()->for($user)->create(['source' => 'google', 'external_id' => 'evt-1']);

        $this->actingAs($user, 'sanctum')->postJson('/api/google-calendar/sync')->assertOk();

        $this->assertDatabaseMissing('calendar_blocks', ['external_id' => 'evt-1']);
    }

    public function test_disconnect_removes_the_connection_and_pulled_blocks(): void
    {
        $user = User::factory()->create();
        GoogleCalendarConnection::factory()->for($user)->create();
        CalendarBlock::factory()->for($user)->create(['source' => 'google', 'external_id' => 'evt-1']);
        // A block this app pushed out but didn't pull in — kept, external_id cleared.
        CalendarBlock::factory()->for($user)->create(['source' => null, 'external_id' => 'evt-2']);

        $response = $this->actingAs($user, 'sanctum')->deleteJson('/api/google-calendar/disconnect');

        $response->assertNoContent();
        $this->assertDatabaseMissing('google_calendar_connections', ['user_id' => $user->id]);
        $this->assertDatabaseMissing('calendar_blocks', ['external_id' => 'evt-1']);
        $this->assertDatabaseHas('calendar_blocks', ['external_id' => null, 'source' => null]);
    }

    public function test_a_user_cannot_see_another_users_connection_status(): void
    {
        $owner = User::factory()->create();
        $intruder = User::factory()->create();
        GoogleCalendarConnection::factory()->for($owner)->create();

        $response = $this->actingAs($intruder, 'sanctum')->getJson('/api/google-calendar/status');

        $response->assertOk()->assertJson(['connected' => false]);
    }
}
