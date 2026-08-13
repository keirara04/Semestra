<?php

namespace App\Http\Controllers;

use App\Http\Requests\AcademicCalendarExceptionRequest;
use App\Models\AcademicCalendarException;
use Illuminate\Http\JsonResponse;

class AcademicCalendarExceptionController extends Controller
{
    public function index(): JsonResponse
    {
        $this->authorize('viewAny', AcademicCalendarException::class);

        return response()->json(AcademicCalendarException::orderBy('start_date')->get());
    }

    public function store(AcademicCalendarExceptionRequest $request): JsonResponse
    {
        $this->authorize('create', AcademicCalendarException::class);

        $exception = AcademicCalendarException::create($request->validated());

        return response()->json($exception, 201);
    }

    public function show(AcademicCalendarException $academicCalendarException): JsonResponse
    {
        $this->authorize('view', $academicCalendarException);

        return response()->json($academicCalendarException);
    }

    public function update(AcademicCalendarExceptionRequest $request, AcademicCalendarException $academicCalendarException): JsonResponse
    {
        $this->authorize('update', $academicCalendarException);

        $academicCalendarException->update($request->validated());

        return response()->json($academicCalendarException);
    }

    public function destroy(AcademicCalendarException $academicCalendarException): JsonResponse
    {
        $this->authorize('delete', $academicCalendarException);

        $academicCalendarException->delete();

        return response()->json(status: 204);
    }
}
