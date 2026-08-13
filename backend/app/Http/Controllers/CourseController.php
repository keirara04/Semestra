<?php

namespace App\Http\Controllers;

use App\Http\Requests\CourseRequest;
use App\Models\Course;
use Illuminate\Http\JsonResponse;

class CourseController extends Controller
{
    public function index(): JsonResponse
    {
        $this->authorize('viewAny', Course::class);

        return response()->json(Course::orderBy('title')->get());
    }

    public function store(CourseRequest $request): JsonResponse
    {
        $this->authorize('create', Course::class);

        $course = Course::create($request->validated());

        return response()->json($course, 201);
    }

    public function show(Course $course): JsonResponse
    {
        $this->authorize('view', $course);

        return response()->json($course->load('classSessions'));
    }

    public function update(CourseRequest $request, Course $course): JsonResponse
    {
        $this->authorize('update', $course);

        $course->update($request->validated());

        return response()->json($course);
    }

    public function destroy(Course $course): JsonResponse
    {
        $this->authorize('delete', $course);

        $course->delete();

        return response()->json(status: 204);
    }
}
