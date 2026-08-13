<?php

namespace App\Http\Controllers;

use App\Http\Requests\MilestoneRequest;
use App\Models\Milestone;
use Illuminate\Http\JsonResponse;

class MilestoneController extends Controller
{
    public function index(): JsonResponse
    {
        $this->authorize('viewAny', Milestone::class);

        return response()->json(Milestone::orderBy('order')->get());
    }

    public function store(MilestoneRequest $request): JsonResponse
    {
        $this->authorize('create', Milestone::class);

        $milestone = Milestone::create($request->validated());

        return response()->json($milestone, 201);
    }

    public function show(Milestone $milestone): JsonResponse
    {
        $this->authorize('view', $milestone);

        return response()->json($milestone->load('tasks'));
    }

    public function update(MilestoneRequest $request, Milestone $milestone): JsonResponse
    {
        $this->authorize('update', $milestone);

        $milestone->update($request->validated());

        return response()->json($milestone);
    }

    public function destroy(Milestone $milestone): JsonResponse
    {
        $this->authorize('delete', $milestone);

        $milestone->delete();

        return response()->json(status: 204);
    }
}
