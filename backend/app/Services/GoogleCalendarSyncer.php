<?php

namespace App\Services;

use App\Models\CalendarBlock;
use App\Models\GoogleCalendarConnection;
use App\Models\User;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Log;

/**
 * Both directions of the sync live here, not split across two classes:
 * pull() and pushBlock()/removeFromGoogle() share the same "never touch
 * what the other direction owns" invariant (see the `source` column
 * docblock on its migration), so keeping them next to each other makes
 * that invariant easier to keep honest than if they drifted into
 * separate files.
 */
class GoogleCalendarSyncer
{
    public function __construct(private readonly GoogleCalendarClient $client) {}

    /**
     * Pull Google's changes since the last sync into CalendarBlock rows
     * with `source: 'google'`. Returns how many events were processed.
     */
    public function pull(User $user): int
    {
        $connection = GoogleCalendarConnection::where('user_id', $user->id)->first();

        if ($connection === null) {
            return 0;
        }

        try {
            $result = $this->client->listEvents($connection, $connection->sync_token);
        } catch (RequestException $e) {
            // 410 Gone: the sync token is no longer valid (too old, or the
            // calendar was reset) — Google's documented recovery is to
            // drop it and do one full resync, not treat this as a failure.
            if ($e->response->status() === 410) {
                $connection->update(['sync_token' => null]);
                $result = $this->client->listEvents($connection, null);
            } else {
                throw $e;
            }
        }

        foreach ($result['events'] as $event) {
            $this->applyPulledEvent($event);
        }

        $connection->update([
            'sync_token' => $result['nextSyncToken'],
            'last_synced_at' => now(),
        ]);

        return count($result['events']);
    }

    /**
     * Push a student-created block out to Google. No-op for anything not
     * eligible (pulled-from-Google blocks, lectures, suggested/skipped
     * blocks) or for a user with no connection — callers don't need to
     * check eligibility themselves before calling this.
     */
    public function pushBlock(CalendarBlock $block): void
    {
        if (! $this->isPushable($block)) {
            return;
        }

        $connection = GoogleCalendarConnection::where('user_id', $block->user_id)->first();

        if ($connection === null) {
            return;
        }

        $event = [
            'summary' => $block->title ?? ucfirst($block->type),
            'location' => $block->location,
            'description' => $block->description,
            'start' => ['dateTime' => $block->start_at->toRfc3339String()],
            'end' => ['dateTime' => $block->end_at->toRfc3339String()],
        ];

        try {
            if ($block->external_id !== null) {
                $this->client->updateEvent($connection, $block->external_id, $event);
            } else {
                $created = $this->client->createEvent($connection, $event);
                $block->update(['external_id' => $created['id']]);
            }
        } catch (RequestException $e) {
            // Best-effort: the block already saved locally, a Google API
            // hiccup shouldn't fail the student's create/edit request.
            Log::warning('GoogleCalendarSyncer::pushBlock failed', ['block_id' => $block->id, 'error' => $e->getMessage()]);
        }
    }

    public function removeFromGoogle(CalendarBlock $block): void
    {
        if ($block->source !== null || $block->external_id === null) {
            return;
        }

        $connection = GoogleCalendarConnection::where('user_id', $block->user_id)->first();

        if ($connection === null) {
            return;
        }

        try {
            $this->client->deleteEvent($connection, $block->external_id);
        } catch (RequestException $e) {
            Log::warning('GoogleCalendarSyncer::removeFromGoogle failed', ['block_id' => $block->id, 'error' => $e->getMessage()]);
        }
    }

    private function isPushable(CalendarBlock $block): bool
    {
        return $block->source === null
            && in_array($block->type, ['study', 'commitment'], true)
            && in_array($block->status, ['accepted', 'moved', 'done'], true);
    }

    private function applyPulledEvent(array $event): void
    {
        $externalId = $event['id'];

        if (($event['status'] ?? null) === 'cancelled') {
            CalendarBlock::where('source', 'google')->where('external_id', $externalId)->delete();

            return;
        }

        $start = $event['start']['dateTime'] ?? null;
        $end = $event['end']['dateTime'] ?? null;

        // All-day events (date, not dateTime) are v1 scope-out — this app's
        // block model is time-ranged, not date-ranged; flagged here rather
        // than silently mis-rendering a 24-hour block.
        if ($start === null || $end === null) {
            return;
        }

        CalendarBlock::updateOrCreate(
            ['source' => 'google', 'external_id' => $externalId],
            [
                'type' => 'external',
                'status' => 'accepted',
                'title' => $event['summary'] ?? 'Busy',
                'location' => $event['location'] ?? null,
                'description' => $event['description'] ?? null,
                'start_at' => $start,
                'end_at' => $end,
            ],
        );
    }
}
