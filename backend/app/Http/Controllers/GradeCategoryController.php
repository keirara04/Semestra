<?php

namespace App\Http\Controllers;

use App\Http\Requests\GradeCategoryRequest;
use App\Models\GradeCategory;
use Illuminate\Http\JsonResponse;

class GradeCategoryController extends Controller
{
    public function index(): JsonResponse
    {
        $this->authorize('viewAny', GradeCategory::class);

        return response()->json(GradeCategory::orderBy('name')->get());
    }

    public function store(GradeCategoryRequest $request): JsonResponse
    {
        $this->authorize('create', GradeCategory::class);

        $category = GradeCategory::create($request->validated());

        return response()->json($category, 201);
    }

    public function show(GradeCategory $gradeCategory): JsonResponse
    {
        $this->authorize('view', $gradeCategory);

        return response()->json($gradeCategory);
    }

    public function update(GradeCategoryRequest $request, GradeCategory $gradeCategory): JsonResponse
    {
        $this->authorize('update', $gradeCategory);

        $gradeCategory->update($request->validated());

        return response()->json($gradeCategory);
    }

    public function destroy(GradeCategory $gradeCategory): JsonResponse
    {
        $this->authorize('delete', $gradeCategory);

        $gradeCategory->delete();

        return response()->json(status: 204);
    }
}
