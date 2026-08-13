<?php

namespace App\Http\Controllers;

use App\Http\Requests\CalendarBlockRequest;
use App\Models\CalendarBlock;
use Illuminate\Http\JsonResponse;

class CalendarBlockController extends Controller
{
    public function index(): JsonResponse
    {
        $this->authorize('viewAny', CalendarBlock::class);

        return response()->json(CalendarBlock::orderBy('start_at')->get());
    }

    public function store(CalendarBlockRequest $request): JsonResponse
    {
        $this->authorize('create', CalendarBlock::class);

        $block = CalendarBlock::create($request->validated());

        return response()->json($block, 201);
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

        // A manual time change is itself the "accept this, but at a
        // different time" signal — see "Manual calendar moves persist as
        // intentional changes" in the plan. Treated the same as pinned:
        // the next run must not silently move it back.
        $timesChanged = array_key_exists('start_at', $validated) || array_key_exists('end_at', $validated);
        if ($timesChanged && ! array_key_exists('status', $validated) && $calendarBlock->status !== 'done') {
            $validated['status'] = 'moved';
        }

        $calendarBlock->update($validated);

        return response()->json($calendarBlock);
    }

    public function destroy(CalendarBlock $calendarBlock): JsonResponse
    {
        $this->authorize('delete', $calendarBlock);

        $calendarBlock->delete();

        return response()->json(status: 204);
    }
}
