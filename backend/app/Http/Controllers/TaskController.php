<?php

namespace App\Http\Controllers;

use App\Http\Requests\TaskRequest;
use App\Models\Task;
use Illuminate\Http\JsonResponse;

class TaskController extends Controller
{
    public function index(): JsonResponse
    {
        $this->authorize('viewAny', Task::class);

        return response()->json(Task::orderBy('due_at')->get());
    }

    public function store(TaskRequest $request): JsonResponse
    {
        $this->authorize('create', Task::class);

        $task = Task::create($request->validated());

        return response()->json($task, 201);
    }

    public function show(Task $task): JsonResponse
    {
        $this->authorize('view', $task);

        return response()->json($task);
    }

    public function update(TaskRequest $request, Task $task): JsonResponse
    {
        $this->authorize('update', $task);

        $task->update($request->validated());

        return response()->json($task);
    }

    public function destroy(Task $task): JsonResponse
    {
        $this->authorize('delete', $task);

        $task->delete();

        return response()->json(status: 204);
    }
}
