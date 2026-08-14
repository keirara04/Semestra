<?php

use App\Http\Controllers\AcademicCalendarExceptionController;
use App\Http\Controllers\AiSettingsController;
use App\Http\Controllers\AnnotationSyncController;
use App\Http\Controllers\AssessmentController;
use App\Http\Controllers\CalendarBlockController;
use App\Http\Controllers\CalendarCapacityController;
use App\Http\Controllers\ClassSessionController;
use App\Http\Controllers\ClassSessionExceptionController;
use App\Http\Controllers\CommitmentController;
use App\Http\Controllers\CourseController;
use App\Http\Controllers\CourseGradesController;
use App\Http\Controllers\ExamReadinessController;
use App\Http\Controllers\GradeCategoryController;
use App\Http\Controllers\GradeItemController;
use App\Http\Controllers\MaterialAnnotationController;
use App\Http\Controllers\MaterialController;
use App\Http\Controllers\MaterialNoteController;
use App\Http\Controllers\MaterialStateController;
use App\Http\Controllers\MilestoneController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\PlanningFeasibilityController;
use App\Http\Controllers\PlanningRankingController;
use App\Http\Controllers\PlanningRunController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\SemesterController;
use App\Http\Controllers\StudyPlanController;
use App\Http\Controllers\StudySessionController;
use App\Http\Controllers\SubmissionController;
use App\Http\Controllers\SyllabusDraftController;
use App\Http\Controllers\TaskController;
use App\Http\Controllers\TodayController;
use App\Http\Controllers\TopicController;
use App\Http\Controllers\WeeklyReviewController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// Everything mounted under /api, served from api.<domain> per the
// hosting/subdomain decision in the plan.

// Notestra: signed streaming route for materials on the local disk (the
// "spaces" branch of Material::temporaryViewUrl() never hits this; auth is
// the URL signature itself, not the session, so it stays outside the
// auth:sanctum group. See mdfile/NOTESTRA_FUNCTIONAL_SPEC.md, Section 4).
Route::get('/materials/{material}/stream', [MaterialController::class, 'stream'])
    ->middleware('signed')
    ->name('materials.stream');

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', function (Request $request) {
        return $request->user();
    });
    // Settings, see "Settings" in mdfile/DESIGN.md.
    Route::patch('/user', [ProfileController::class, 'update']);
    Route::delete('/user', [ProfileController::class, 'destroy']);

    // Foundation Phase 1: Core data model. Route-model binding is
    // automatically owner-scoped by BelongsToUser's global scope; the
    // controllers additionally call Policy::view/update/delete as a second,
    // independent check (see "Authorization model" in the plan).
    Route::apiResource('semesters', SemesterController::class);
    Route::apiResource('academic-calendar-exceptions', AcademicCalendarExceptionController::class);
    Route::apiResource('courses', CourseController::class);
    // Planning Engine Phase A: Grade tracker. Thin controller over
    // App\Engine\Grade (pure PHP, fixture-tested separately).
    Route::get('/courses/{course}/grades', CourseGradesController::class);
    Route::apiResource('class-sessions', ClassSessionController::class);
    Route::apiResource('class-session-exceptions', ClassSessionExceptionController::class);
    Route::apiResource('commitments', CommitmentController::class);

    // Foundation Phase 2: Assessments as multi-day projects.
    Route::apiResource('grade-categories', GradeCategoryController::class);
    Route::apiResource('grade-items', GradeItemController::class);
    Route::apiResource('assessments', AssessmentController::class);
    // Academic Intelligence Phase D: Exam mode. Thin controller over
    // App\Engine\Exam (pure PHP, fixture-tested separately).
    Route::get('/assessments/{assessment}/readiness', ExamReadinessController::class);
    Route::apiResource('milestones', MilestoneController::class);
    Route::apiResource('tasks', TaskController::class);
    Route::apiResource('submissions', SubmissionController::class);

    // Foundation Phase 3: Capacity engine. Thin controller over
    // App\Engine\Capacity (pure PHP, fixture-tested separately).
    Route::get('/calendar/capacity', CalendarCapacityController::class);

    // Foundation Phase 4: Focus sessions and work logs.
    Route::apiResource('calendar-blocks', CalendarBlockController::class);
    Route::post('/study-sessions/start', [StudySessionController::class, 'start']);
    Route::get('/study-sessions', [StudySessionController::class, 'index']);
    Route::get('/study-sessions/{studySession}', [StudySessionController::class, 'show']);
    Route::post('/study-sessions/{studySession}/pause', [StudySessionController::class, 'pause']);
    Route::post('/study-sessions/{studySession}/resume', [StudySessionController::class, 'resume']);
    Route::post('/study-sessions/{studySession}/end', [StudySessionController::class, 'end']);
    Route::post('/study-sessions/{studySession}/reflect', [StudySessionController::class, 'reflect']);

    // Foundation Phase 5: Today dashboard.
    Route::get('/today', TodayController::class);

    // Planning Engine Phase B: Feasibility pass.
    Route::get('/planning/feasibility', PlanningFeasibilityController::class);

    // Planning Engine Phase C: Ranking.
    Route::get('/planning/ranking', PlanningRankingController::class);

    // Planning Engine Phase D: Placement. Writes suggested CalendarBlocks.
    Route::post('/planning/run', PlanningRunController::class);

    // Planning Engine Phase E: Plan stability + runs.
    Route::get('/planning/plans/latest', [StudyPlanController::class, 'latest']);

    // Academic Intelligence Phase A: Materials library.
    Route::apiResource('materials', MaterialController::class);

    // Notestra: in-browser PDF annotation workspace (see mdfile/NOTESTRA_FUNCTIONAL_SPEC.md).
    Route::get('/materials/{material}/view-url', [MaterialController::class, 'viewUrl']);
    Route::get('/materials/{material}/annotations', [MaterialAnnotationController::class, 'index']);
    Route::put('/materials/{material}/annotations', [AnnotationSyncController::class, 'sync']);
    Route::get('/materials/{material}/notes', [MaterialNoteController::class, 'index']);
    Route::post('/materials/{material}/notes', [MaterialNoteController::class, 'store']);
    Route::patch('/notes/{note}', [MaterialNoteController::class, 'update']);
    Route::delete('/notes/{note}', [MaterialNoteController::class, 'destroy']);
    Route::get('/materials/{material}/state', [MaterialStateController::class, 'show']);
    Route::put('/materials/{material}/state', [MaterialStateController::class, 'update']);

    // Academic Intelligence Phase B: Topics + confidence.
    Route::apiResource('topics', TopicController::class);

    // Automation Phase A: Notifications.
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::post('/notifications/{notification}/read', [NotificationController::class, 'markRead']);

    // Automation Phase B: Weekly review.
    Route::get('/weekly-reviews/latest', [WeeklyReviewController::class, 'latest']);

    // AI Phase 1/2: provider infra + syllabus extraction (Stage 1, see mdfile/AI.md).
    Route::patch('/ai/consent', [AiSettingsController::class, 'updateConsent']);
    Route::get('/ai/usage', [AiSettingsController::class, 'usage']);
    Route::post('/courses/{course}/syllabus-drafts', [SyllabusDraftController::class, 'store']);
    Route::post('/syllabus-drafts/{draft}/confirm', [SyllabusDraftController::class, 'confirm']);
    Route::post('/syllabus-drafts/{draft}/discard', [SyllabusDraftController::class, 'discard']);
});
