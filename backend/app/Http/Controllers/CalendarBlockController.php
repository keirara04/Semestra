<?php

namespace App\Http\Controllers;

use App\Http\Requests\CalendarBlockRequest;
use App\Models\CalendarBlock;
use App\Services\GoogleCalendarSyncer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class CalendarBlockController extends Controller
{
    // Weekly occurrences generated from one "repeat until" create. Caps
    // how far a single request can spawn rows — same v1 scope-boundary
    // instinct as PlacementCalculator's own caps, not a hard product limit.
    private const MAX_RECURRENCE_OCCURRENCES = 26;

    public function __construct(private readonly GoogleCalendarSyncer $googleSync) {}

    public function index(): JsonResponse
    {
        $this->authorize('viewAny', CalendarBlock::class);

        return response()->json(CalendarBlock::orderBy('start_at')->get());
    }

    public function store(CalendarBlockRequest $request): JsonResponse
    {
        $this->authorize('create', CalendarBlock::class);

        $validated = $request->validated();
        $recurrenceUntil = $validated['recurrence_until'] ?? null;
        unset($validated['recurrence_until']);
        $validated = $this->normalizeTimezone($validated, $request->user()->timezone);

        if ($recurrenceUntil === null) {
            $block = CalendarBlock::create($validated);
            $this->googleSync->pushBlock($block);

            return response()->json($block, 201);
        }

        // Only the first occurrence gets pushed to Google — pushing an
        // entire recurring series is a synchronous API call per
        // occurrence (up to MAX_RECURRENCE_OCCURRENCES of them), too slow
        // for a single request. Full-series push is out of scope for v1.
        $primary = $this->createRecurringSeries($validated, $recurrenceUntil, $request->user()->timezone);
        $this->googleSync->pushBlock($primary);

        return response()->json($primary, 201);
    }

    public function show(CalendarBlock $calendarBlock): JsonResponse
    {
        $this->authorize('view', $calendarBlock);

        return response()->json($calendarBlock);
    }

    public function update(CalendarBlockRequest $request, CalendarBlock $calendarBlock): JsonResponse
    {
        $this->authorize('update', $calendarBlock);

        $validated = $request->validated();
        // Create-only field — see the note on the validation rule.
        unset($validated['recurrence_until']);
        $validated = $this->normalizeTimezone($validated, $request->user()->timezone);

        // A manual time change is itself the "accept this, but at a
        // different time" signal, see "Manual calendar moves persist as
        // intentional changes" in the plan. Treated the same as pinned:
        // the next run must not silently move it back.
        $timesChanged = array_key_exists('start_at', $validated) || array_key_exists('end_at', $validated);
        if ($timesChanged && ! array_key_exists('status', $validated) && $calendarBlock->status !== 'done') {
            $validated['status'] = 'moved';
        }

        $calendarBlock->update($validated);
        $this->googleSync->pushBlock($calendarBlock);

        return response()->json($calendarBlock);
    }

    /**
     * Deleting a block that belongs to a recurring series takes a
     * `scope` query param: "this" (default, matches the non-recurring
     * behavior below), "following" (this and every later occurrence in
     * the series), or "all" (the whole series, including earlier
     * occurrences). Unscoped delete stays exactly as it was for a block
     * with no `recurrence_group_id` — no behavior change there.
     */
    public function destroy(Request $request, CalendarBlock $calendarBlock): JsonResponse
    {
        $this->authorize('delete', $calendarBlock);

        $scope = $request->query('scope', 'this');

        if ($calendarBlock->recurrence_group_id === null || $scope === 'this') {
            $this->googleSync->removeFromGoogle($calendarBlock);
            $calendarBlock->delete();

            return response()->json(status: 204);
        }

        $query = CalendarBlock::where('recurrence_group_id', $calendarBlock->recurrence_group_id);

        if ($scope === 'following') {
            $query->where('start_at', '>=', $calendarBlock->start_at);
        }

        // Only the primary occurrence is ever pushed to Google (see
        // store()), so it's the only one that could have an external_id
        // to clean up here.
        $query->get()->each(fn (CalendarBlock $occurrence) => $this->googleSync->removeFromGoogle($occurrence));
        $query->delete();

        return response()->json(status: 204);
    }

    /**
     * `start_at`/`end_at` come in from the frontend as naive strings
     * ("2026-08-15T09:00", no offset) meaning "9am in the student's own
     * timezone" — Laravel's datetime cast has no way to know that on its
     * own and would parse them against config('app.timezone') (hardcoded
     * UTC), silently storing the wrong instant for any non-UTC user. This
     * is what PlanningRunner already does correctly for auto-placed
     * blocks (Carbon::parse($str, $timezone)); the manual create/update
     * path never did, until now — every write here goes through this
     * first so the two paths agree.
     *
     * @param  array<string, mixed>  $validated
     * @return array<string, mixed>
     */
    private function normalizeTimezone(array $validated, string $timezone): array
    {
        foreach (['start_at', 'end_at'] as $field) {
            if (array_key_exists($field, $validated) && $validated[$field] !== null) {
                $validated[$field] = Carbon::parse($validated[$field], $timezone)->utc();
            }
        }

        return $validated;
    }

    /**
     * @param  array<string, mixed>  $validated  Already stripped of recurrence_until, start_at/end_at already normalized to UTC.
     */
    private function createRecurringSeries(array $validated, string $recurrenceUntil, string $timezone): CalendarBlock
    {
        return DB::transaction(function () use ($validated, $recurrenceUntil, $timezone) {
            $startAt = Carbon::parse($validated['start_at']);
            $endAt = Carbon::parse($validated['end_at']);
            // recurrence_until is a plain date ("until Aug 30"), meant
            // inclusive through the end of that day in the student's own
            // timezone, not UTC's — same reasoning as normalizeTimezone().
            $until = Carbon::parse($recurrenceUntil, $timezone)->endOfDay()->utc();
            $durationMinutes = $startAt->diffInMinutes($endAt);

            $occurrenceStarts = [];
            $cursor = $startAt->copy();
            while ($cursor->lte($until) && count($occurrenceStarts) < self::MAX_RECURRENCE_OCCURRENCES) {
                $occurrenceStarts[] = $cursor->copy();
                $cursor = $cursor->copy()->addWeek();
            }

            $primary = null;

            foreach ($occurrenceStarts as $index => $occurrenceStart) {
                $block = CalendarBlock::create([
                    ...$validated,
                    'start_at' => $occurrenceStart,
                    'end_at' => $occurrenceStart->copy()->addMinutes($durationMinutes),
                    'recurrence_group_id' => $primary?->id,
                    // dayOfWeek from the student's own timezone, not UTC's
                    // — a block at 11pm local can already be past
                    // midnight UTC, which would record the wrong weekday.
                    'recurrence_day_of_week' => $index === 0 ? $occurrenceStart->copy()->setTimezone($timezone)->dayOfWeek : null,
                    'recurrence_until' => $index === 0 ? $until->format('Y-m-d') : null,
                ]);

                if ($index === 0) {
                    $primary = $block;
                    $primary->update(['recurrence_group_id' => $primary->id]);
                }
            }

            return $primary;
        });
    }
}
