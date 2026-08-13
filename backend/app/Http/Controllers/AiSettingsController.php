<?php

namespace App\Http\Controllers;

use App\Services\AI\AiBudgetService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Per-feature consent, off by default, and the visible remaining budget
 * the student is entitled to see before spending it — see "Consent
 * levels" and "hard token budgets ... with remaining budget visible to
 * the student" in mdfile/AI.md and mdfile/semester-command-center.md.
 */
class AiSettingsController extends Controller
{
    public function updateConsent(Request $request): JsonResponse
    {
        $validated = $request->validate(['enabled' => ['required', 'boolean']]);

        $user = $request->user();
        $user->forceFill([
            'ai_syllabus_extraction_consent_at' => $validated['enabled'] ? now() : null,
        ])->save();

        return response()->json(['ai_syllabus_extraction_consent_at' => $user->ai_syllabus_extraction_consent_at]);
    }

    public function usage(Request $request, AiBudgetService $budget): JsonResponse
    {
        return response()->json([
            'remaining' => $budget->remaining($request->user()),
            'limit' => (int) config('services.openrouter.daily_request_limit'),
        ]);
    }
}
