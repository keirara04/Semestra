<?php

namespace App\Http\Controllers;

use App\Http\Requests\GradeItemRequest;
use App\Models\GradeItem;
use Illuminate\Http\JsonResponse;

class GradeItemController extends Controller
{
    public function index(): JsonResponse
    {
        $this->authorize('viewAny', GradeItem::class);

        return response()->json(GradeItem::orderBy('name')->get());
    }

    public function store(GradeItemRequest $request): JsonResponse
    {
        $this->authorize('create', GradeItem::class);

        $gradeItem = GradeItem::create($request->validated());

        return response()->json($gradeItem, 201);
    }

    public function show(GradeItem $gradeItem): JsonResponse
    {
        $this->authorize('view', $gradeItem);

        return response()->json($gradeItem);
    }

    public function update(GradeItemRequest $request, GradeItem $gradeItem): JsonResponse
    {
        $this->authorize('update', $gradeItem);

        $gradeItem->update($request->validated());

        return response()->json($gradeItem);
    }

    public function destroy(GradeItem $gradeItem): JsonResponse
    {
        $this->authorize('delete', $gradeItem);

        $gradeItem->delete();

        return response()->json(status: 204);
    }
}
