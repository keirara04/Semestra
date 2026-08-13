<?php

namespace App\Http\Controllers;

use App\Http\Requests\AssessmentRequest;
use App\Models\Assessment;
use Illuminate\Http\JsonResponse;

class AssessmentController extends Controller
{
    public function index(): JsonResponse
    {
        $this->authorize('viewAny', Assessment::class);

        return response()->json(
            Assessment::orderBy('due_at')->get()->map->append('remaining_minutes')
        );
    }

    public function store(AssessmentRequest $request): JsonResponse
    {
        $this->authorize('create', Assessment::class);

        $assessment = Assessment::create($request->validated());

        return response()->json($assessment, 201);
    }

    public function show(Assessment $assessment): JsonResponse
    {
        $this->authorize('view', $assessment);

        $assessment->load(['milestones.tasks', 'tasks', 'submissions'])->append('remaining_minutes');

        return response()->json($assessment);
    }

    public function update(AssessmentRequest $request, Assessment $assessment): JsonResponse
    {
        $this->authorize('update', $assessment);

        $assessment->update($request->validated());

        return response()->json($assessment->append('remaining_minutes'));
    }

    public function destroy(Assessment $assessment): JsonResponse
    {
        $this->authorize('delete', $assessment);

        $assessment->delete();

        return response()->json(status: 204);
    }
}
