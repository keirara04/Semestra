<?php

namespace App\Http\Controllers;

use App\Http\Requests\SubmissionRequest;
use App\Models\Submission;
use Illuminate\Http\JsonResponse;

class SubmissionController extends Controller
{
    public function index(): JsonResponse
    {
        $this->authorize('viewAny', Submission::class);

        return response()->json(Submission::orderBy('created_at', 'desc')->get());
    }

    public function store(SubmissionRequest $request): JsonResponse
    {
        $this->authorize('create', Submission::class);

        $submission = Submission::create($request->validated());

        return response()->json($submission, 201);
    }

    public function show(Submission $submission): JsonResponse
    {
        $this->authorize('view', $submission);

        return response()->json($submission);
    }

    public function update(SubmissionRequest $request, Submission $submission): JsonResponse
    {
        $this->authorize('update', $submission);

        $submission->update($request->validated());

        return response()->json($submission);
    }

    public function destroy(Submission $submission): JsonResponse
    {
        $this->authorize('delete', $submission);

        $submission->delete();

        return response()->json(status: 204);
    }
}
