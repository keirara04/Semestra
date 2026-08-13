<?php

namespace App\Http\Controllers;

use App\Engine\Capacity\CapacityCalculator;
use App\Http\Controllers\Concerns\BuildsCapacityInputs;
use DateTimeImmutable;
use DateTimeZone;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Thin controller — all the actual math lives in App\Engine\Capacity
 * (framework-agnostic, no Eloquent), per "Planning engine boundary" in
 * the plan. This class only translates Eloquent rows into the engine's
 * plain input objects and back into JSON.
 */
class CalendarCapacityController extends Controller
{
    use BuildsCapacityInputs;

    public function __invoke(Request $request, CapacityCalculator $calculator): JsonResponse
    {
        $validated = $request->validate([
            'from' => ['required', 'date'],
            'to' => ['required', 'date', 'after_or_equal:from'],
        ]);

        $user = $request->user();
        $timezone = new DateTimeZone($user->timezone);

        $days = $calculator->calculate(
            $this->classSessionInputs(),
            $this->commitmentInputs(),
            $this->breakInputs(),
            $user->max_study_hours_per_day,
            $timezone,
            new DateTimeImmutable($validated['from'], $timezone),
            new DateTimeImmutable($validated['to'], $timezone),
        );

        return response()->json(array_map(fn ($day) => $day->toArray(), $days));
    }
}
