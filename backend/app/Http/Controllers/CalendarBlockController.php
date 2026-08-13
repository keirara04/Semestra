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

        $calendarBlock->update($request->validated());

        return response()->json($calendarBlock);
    }

    public function destroy(CalendarBlock $calendarBlock): JsonResponse
    {
        $this->authorize('delete', $calendarBlock);

        $calendarBlock->delete();

        return response()->json(status: 204);
    }
}
