<?php

namespace App\Http\Controllers;

use App\Http\Requests\ClassSessionRequest;
use App\Models\ClassSession;
use Illuminate\Http\JsonResponse;

class ClassSessionController extends Controller
{
    public function index(): JsonResponse
    {
        $this->authorize('viewAny', ClassSession::class);

        return response()->json(ClassSession::orderBy('day_of_week')->orderBy('start_time')->get());
    }

    public function store(ClassSessionRequest $request): JsonResponse
    {
        $this->authorize('create', ClassSession::class);

        $classSession = ClassSession::create($request->validated());

        return response()->json($classSession, 201);
    }

    public function show(ClassSession $classSession): JsonResponse
    {
        $this->authorize('view', $classSession);

        return response()->json($classSession->load('exceptions'));
    }

    public function update(ClassSessionRequest $request, ClassSession $classSession): JsonResponse
    {
        $this->authorize('update', $classSession);

        $classSession->update($request->validated());

        return response()->json($classSession);
    }

    public function destroy(ClassSession $classSession): JsonResponse
    {
        $this->authorize('delete', $classSession);

        $classSession->delete();

        return response()->json(status: 204);
    }
}
