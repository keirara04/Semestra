<?php

use App\Http\Controllers\AcademicCalendarExceptionController;
use App\Http\Controllers\AssessmentController;
use App\Http\Controllers\CalendarBlockController;
use App\Http\Controllers\CalendarCapacityController;
use App\Http\Controllers\ClassSessionController;
use App\Http\Controllers\ClassSessionExceptionController;
use App\Http\Controllers\CommitmentController;
use App\Http\Controllers\CourseController;
use App\Http\Controllers\CourseGradesController;
use App\Http\Controllers\GradeCategoryController;
use App\Http\Controllers\GradeItemController;
use App\Http\Controllers\MilestoneController;
use App\Http\Controllers\SemesterController;
use App\Http\Controllers\StudySessionController;
use App\Http\Controllers\SubmissionController;
use App\Http\Controllers\TaskController;
use App\Http\Controllers\TodayController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// Everything mounted under /api, served from api.<domain> per the
// hosting/subdomain decision in the plan.

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', function (Request $request) {
        return $request->user();
    });

    // Foundation Phase 1 — Core data model. Route-model binding is
    // automatically owner-scoped by BelongsToUser's global scope; the
    // controllers additionally call Policy::view/update/delete as a second,
    // independent check (see "Authorization model" in the plan).
    Route::apiResource('semesters', SemesterController::class);
    Route::apiResource('academic-calendar-exceptions', AcademicCalendarExceptionController::class);
    Route::apiResource('courses', CourseController::class);
    // Planning Engine Phase A — Grade tracker. Thin controller over
    // App\Engine\Grade (pure PHP, fixture-tested separately).
    Route::get('/courses/{course}/grades', CourseGradesController::class);
    Route::apiResource('class-sessions', ClassSessionController::class);
    Route::apiResource('class-session-exceptions', ClassSessionExceptionController::class);
    Route::apiResource('commitments', CommitmentController::class);

    // Foundation Phase 2 — Assessments as multi-day projects.
    Route::apiResource('grade-categories', GradeCategoryController::class);
    Route::apiResource('grade-items', GradeItemController::class);
    Route::apiResource('assessments', AssessmentController::class);
    Route::apiResource('milestones', MilestoneController::class);
    Route::apiResource('tasks', TaskController::class);
    Route::apiResource('submissions', SubmissionController::class);

    // Foundation Phase 3 — Capacity engine. Thin controller over
    // App\Engine\Capacity (pure PHP, fixture-tested separately).
    Route::get('/calendar/capacity', CalendarCapacityController::class);

    // Foundation Phase 4 — Focus sessions and work logs.
    Route::apiResource('calendar-blocks', CalendarBlockController::class);
    Route::post('/study-sessions/start', [StudySessionController::class, 'start']);
    Route::get('/study-sessions', [StudySessionController::class, 'index']);
    Route::get('/study-sessions/{studySession}', [StudySessionController::class, 'show']);
    Route::post('/study-sessions/{studySession}/pause', [StudySessionController::class, 'pause']);
    Route::post('/study-sessions/{studySession}/resume', [StudySessionController::class, 'resume']);
    Route::post('/study-sessions/{studySession}/end', [StudySessionController::class, 'end']);
    Route::post('/study-sessions/{studySession}/reflect', [StudySessionController::class, 'reflect']);

    // Foundation Phase 5 — Today dashboard.
    Route::get('/today', TodayController::class);
});
