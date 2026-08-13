<?php

namespace App\Http\Controllers;

use App\Http\Requests\ClassSessionExceptionRequest;
use App\Models\ClassSessionException;
use Illuminate\Http\JsonResponse;

class ClassSessionExceptionController extends Controller
{
    public function index(): JsonResponse
    {
        $this->authorize('viewAny', ClassSessionException::class);

        return response()->json(ClassSessionException::orderBy('date')->get());
    }

    public function store(ClassSessionExceptionRequest $request): JsonResponse
    {
        $this->authorize('create', ClassSessionException::class);

        $exception = ClassSessionException::create($request->validated());

        return response()->json($exception, 201);
    }

    public function show(ClassSessionException $classSessionException): JsonResponse
    {
        $this->authorize('view', $classSessionException);

        return response()->json($classSessionException);
    }

    public function update(ClassSessionExceptionRequest $request, ClassSessionException $classSessionException): JsonResponse
    {
        $this->authorize('update', $classSessionException);

        $classSessionException->update($request->validated());

        return response()->json($classSessionException);
    }

    public function destroy(ClassSessionException $classSessionException): JsonResponse
    {
        $this->authorize('delete', $classSessionException);

        $classSessionException->delete();

        return response()->json(status: 204);
    }
}
