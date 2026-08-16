<?php

namespace App\Services;

use App\Models\GoogleCalendarConnection;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Http;

/**
 * Thin wrapper over the Calendar API v3 REST endpoints via Http, not the
 * official google/apiclient SDK — that library pulls in a large dependency
 * tree for what this app only needs (list/insert/update/delete on one
 * calendar's events). Socialite already handles the OAuth code exchange;
 * this only handles refreshing an expired access_token and the event CRUD.
 */
class GoogleCalendarClient
{
    private const BASE_URL = 'https://www.googleapis.com/calendar/v3';

    /**
     * Refreshes and persists a new access_token if the current one has
     * expired. Every other method here assumes a fresh token, so callers
     * always run this first — see each public method below.
     */
    public function ensureFreshToken(GoogleCalendarConnection $connection): GoogleCalendarConnection
    {
        if (! $connection->isExpired()) {
            return $connection;
        }

        $response = Http::asForm()->post('https://oauth2.googleapis.com/token', [
            'client_id' => config('services.google.client_id'),
            'client_secret' => config('services.google.client_secret'),
            'refresh_token' => $connection->refresh_token,
            'grant_type' => 'refresh_token',
        ])->throw();

        $data = $response->json();

        $connection->update([
            'access_token' => $data['access_token'],
            'expires_at' => Carbon::now()->addSeconds($data['expires_in'] ?? 3600),
        ]);

        return $connection->fresh();
    }

    /**
     * @return array{events: array<int, array<string, mixed>>, nextSyncToken: ?string}
     */
    public function listEvents(GoogleCalendarConnection $connection, ?string $syncToken = null): array
    {
        $connection = $this->ensureFreshToken($connection);

        $query = $syncToken !== null
            ? ['syncToken' => $syncToken]
            // No cursor yet: first sync, bounded to a year back / a year
            // ahead rather than a student's entire Google Calendar history.
            : [
                'timeMin' => Carbon::now()->subYear()->toRfc3339String(),
                'timeMax' => Carbon::now()->addYear()->toRfc3339String(),
                'singleEvents' => 'true',
            ];

        $events = [];
        $pageToken = null;
        $nextSyncToken = null;

        do {
            $response = $this->request($connection)
                ->get(self::calendarUrl($connection).'/events', array_filter([
                    ...$query,
                    'pageToken' => $pageToken,
                ]))
                ->throw();

            $data = $response->json();
            $events = [...$events, ...($data['items'] ?? [])];
            $pageToken = $data['nextPageToken'] ?? null;
            $nextSyncToken = $data['nextSyncToken'] ?? $nextSyncToken;
        } while ($pageToken !== null);

        return ['events' => $events, 'nextSyncToken' => $nextSyncToken];
    }

    /**
     * @return array<string, mixed> The created Google event (has its own "id").
     */
    public function createEvent(GoogleCalendarConnection $connection, array $event): array
    {
        $connection = $this->ensureFreshToken($connection);

        return $this->request($connection)
            ->post(self::calendarUrl($connection).'/events', $event)
            ->throw()
            ->json();
    }

    public function updateEvent(GoogleCalendarConnection $connection, string $eventId, array $event): array
    {
        $connection = $this->ensureFreshToken($connection);

        return $this->request($connection)
            ->patch(self::calendarUrl($connection)."/events/{$eventId}", $event)
            ->throw()
            ->json();
    }

    public function deleteEvent(GoogleCalendarConnection $connection, string $eventId): void
    {
        $connection = $this->ensureFreshToken($connection);

        // 410 Gone = already deleted on Google's side — not an error here,
        // the end state (event gone) is exactly what was asked for.
        $response = $this->request($connection)->delete(self::calendarUrl($connection)."/events/{$eventId}");

        if (! $response->successful() && $response->status() !== 410 && $response->status() !== 404) {
            $response->throw();
        }
    }

    private function request(GoogleCalendarConnection $connection): PendingRequest
    {
        return Http::withToken($connection->access_token)->acceptJson();
    }

    private static function calendarUrl(GoogleCalendarConnection $connection): string
    {
        return self::BASE_URL.'/calendars/'.rawurlencode($connection->google_calendar_id);
    }
}
