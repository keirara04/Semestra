<?php

namespace App\Http\Controllers;

use App\Engine\Exam\ReadinessCalculator;
use App\Models\Assessment;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Carbon;

/**
 * Thin controller — the readiness formula lives in App\Engine\Exam (pure
 * PHP, fixture-tested separately). See "Exam mode" in
 * mdfile/semester-command-center.md.
 */
class ExamReadinessController extends Controller
{
    public function __invoke(Assessment $assessment, ReadinessCalculator $calculator): JsonResponse
    {
        $this->authorize('view', $assessment);

        $topics = $assessment->topics()->get(['topics.id', 'topics.title', 'topics.confidence']);
        $daysRemaining = (int) Carbon::now($assessment->user->timezone)->diffInDays($assessment->due_at, false);

        $report = $calculator->calculate($topics->pluck('confidence')->all(), max(0, $daysRemaining));

        return response()->json([
            ...$report->toArray(),
            'days_remaining' => $daysRemaining,
            'topics' => $topics->map(fn ($topic) => [
                'id' => $topic->id,
                'title' => $topic->title,
                'confidence' => $topic->confidence,
            ]),
        ]);
    }
}
