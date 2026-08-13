<?php

namespace App\Http\Controllers;

use App\Http\Requests\ReflectStudySessionRequest;
use App\Http\Requests\StartStudySessionRequest;
use App\Models\StudySession;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Date;
use Illuminate\Validation\ValidationException;

class StudySessionController extends Controller
{
    public function index(): JsonResponse
    {
        $this->authorize('viewAny', StudySession::class);

        return response()->json(StudySession::orderBy('started_at', 'desc')->get());
    }

    public function show(StudySession $studySession): JsonResponse
    {
        $this->authorize('view', $studySession);

        return response()->json($studySession);
    }

    public function start(StartStudySessionRequest $request): JsonResponse
    {
        $this->authorize('create', StudySession::class);

        $session = StudySession::create([
            ...$request->validated(),
            'status' => 'running',
            'started_at' => Date::now(),
        ]);

        return response()->json($session, 201);
    }

    public function pause(StudySession $studySession): JsonResponse
    {
        $this->authorize('update', $studySession);

        if ($studySession->status !== 'running') {
            throw ValidationException::withMessages(['status' => 'Session is not running.']);
        }

        $studySession->update(['status' => 'paused', 'paused_at' => Date::now()]);

        return response()->json($studySession);
    }

    public function resume(StudySession $studySession): JsonResponse
    {
        $this->authorize('update', $studySession);

        if ($studySession->status !== 'paused') {
            throw ValidationException::withMessages(['status' => 'Session is not paused.']);
        }

        $pausedSeconds = (int) $studySession->paused_at->diffInSeconds(Date::now());

        $studySession->update([
            'status' => 'running',
            'paused_at' => null,
            'paused_seconds_total' => $studySession->paused_seconds_total + $pausedSeconds,
        ]);

        return response()->json($studySession);
    }

    public function end(StudySession $studySession): JsonResponse
    {
        $this->authorize('update', $studySession);

        if ($studySession->status === 'ended') {
            throw ValidationException::withMessages(['status' => 'Session has already ended.']);
        }

        $endedAt = Date::now();
        $pausedSeconds = $studySession->paused_seconds_total
            + ($studySession->status === 'paused' ? (int) $studySession->paused_at->diffInSeconds($endedAt) : 0);

        $actualSeconds = max(0, (int) $studySession->started_at->diffInSeconds($endedAt) - $pausedSeconds);

        $studySession->update([
            'status' => 'ended',
            'ended_at' => $endedAt,
            'paused_at' => null,
            'paused_seconds_total' => $pausedSeconds,
            'actual_minutes' => intdiv($actualSeconds, 60),
        ]);

        return response()->json($studySession);
    }

    /**
     * End-of-session reflection — the student, not the timer, decides
     * whether remaining effort changes (see "Edge cases" in the plan:
     * a block ending doesn't imply the work is done).
     */
    public function reflect(ReflectStudySessionRequest $request, StudySession $studySession): JsonResponse
    {
        $this->authorize('update', $studySession);

        $validated = $request->validated();

        $studySession->update([
            'outcome' => $validated['outcome'],
            'notes' => $validated['notes'] ?? null,
            'blocker' => $validated['blocker'] ?? null,
        ]);

        $task = $studySession->calendarBlock->task;

        if ($task) {
            $taskUpdates = array_filter([
                'remaining_estimate_minutes' => $validated['remaining_estimate_minutes'] ?? null,
                'completion_percent' => $validated['completion_percent'] ?? null,
            ], fn ($value) => $value !== null);

            $taskUpdates['actual_minutes_logged'] = $task->actual_minutes_logged + ($studySession->actual_minutes ?? 0);

            if ($validated['outcome'] === 'completed') {
                $taskUpdates['status'] = 'done';
                $taskUpdates['remaining_estimate_minutes'] = 0;
                $taskUpdates['completion_percent'] = 100;
            }

            $task->update($taskUpdates);
        }

        return response()->json($studySession->fresh());
    }
}
