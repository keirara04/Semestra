<?php

namespace App\Http\Controllers;

use App\Http\Requests\SemesterRequest;
use App\Models\Semester;
use Illuminate\Http\JsonResponse;

class SemesterController extends Controller
{
    public function index(): JsonResponse
    {
        $this->authorize('viewAny', Semester::class);

        return response()->json(Semester::orderBy('start_date')->get());
    }

    public function store(SemesterRequest $request): JsonResponse
    {
        $this->authorize('create', Semester::class);

        $semester = Semester::create($request->validated());

        return response()->json($semester, 201);
    }

    public function show(Semester $semester): JsonResponse
    {
        $this->authorize('view', $semester);

        return response()->json($semester->load('academicCalendarExceptions'));
    }

    public function update(SemesterRequest $request, Semester $semester): JsonResponse
    {
        $this->authorize('update', $semester);

        $semester->update($request->validated());

        return response()->json($semester);
    }

    public function destroy(Semester $semester): JsonResponse
    {
        $this->authorize('delete', $semester);

        $semester->delete();

        return response()->json(status: 204);
    }
}
