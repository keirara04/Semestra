<?php

namespace App\Http\Controllers;

use App\Http\Requests\SyllabusDraftConfirmRequest;
use App\Http\Requests\SyllabusDraftRequest;
use App\Models\Assessment;
use App\Models\Course;
use App\Models\Material;
use App\Models\SyllabusDraft;
use App\Models\Task;
use App\Services\AI\AiBudgetExceededException;
use App\Services\AI\AiConsentRequiredException;
use App\Services\AI\AIProviderException;
use App\Services\AI\SyllabusExtractionService;
use Illuminate\Http\JsonResponse;

/**
 * "Every extracted deadline, weighting, or task is presented as an
 * editable draft with source location. Nothing is saved automatically."
 * (Stage 1 in mdfile/AI.md.) store() only ever creates a SyllabusDraft;
 * real Assessment/Task rows are created by confirm(), and only for the
 * candidates the student explicitly kept.
 */
class SyllabusDraftController extends Controller
{
    public function store(SyllabusDraftRequest $request, Course $course, SyllabusExtractionService $extractor): JsonResponse
    {
        $this->authorize('create', SyllabusDraft::class);

        $material = $request->filled('material_id') ? Material::find($request->integer('material_id')) : null;

        try {
            $draft = $extractor->extract($request->user(), $course, $material, $request->string('pasted_text')->toString());
        } catch (AiConsentRequiredException $e) {
            return response()->json(['message' => $e->getMessage()], 403);
        } catch (AiBudgetExceededException $e) {
            return response()->json(['message' => $e->getMessage()], 429);
        } catch (AIProviderException $e) {
            return response()->json(['message' => 'AI extraction failed. Please try again.'], 502);
        }

        return response()->json($draft, 201);
    }

    public function confirm(SyllabusDraftConfirmRequest $request, SyllabusDraft $draft): JsonResponse
    {
        $this->authorize('update', $draft);

        $createdAssessmentIds = [];
        foreach ($request->input('assessments', []) as $candidate) {
            $assessment = Assessment::create([
                'course_id' => $draft->course_id,
                'title' => $candidate['title'],
                'type' => $candidate['type'],
                'due_at' => $candidate['due_at'],
                'status' => 'not_started',
            ]);
            $createdAssessmentIds[] = $assessment->id;
        }

        foreach ($request->input('tasks', []) as $candidate) {
            $assessmentIndex = $candidate['assessment_index'] ?? null;

            Task::create([
                'course_id' => $draft->course_id,
                'assessment_id' => $assessmentIndex !== null ? ($createdAssessmentIds[$assessmentIndex] ?? null) : null,
                'title' => $candidate['title'],
                'estimated_minutes' => $candidate['estimated_minutes'] ?? null,
                'remaining_estimate_minutes' => $candidate['estimated_minutes'] ?? null,
                'status' => 'open',
            ]);
        }

        $draft->update(['status' => 'confirmed', 'applied_at' => now()]);

        return response()->json($draft);
    }

    public function discard(SyllabusDraft $draft): JsonResponse
    {
        $this->authorize('update', $draft);

        $draft->update(['status' => 'discarded']);

        return response()->json($draft);
    }
}
