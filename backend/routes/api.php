<?php

use App\Http\Controllers\AcademicCalendarExceptionController;
use App\Http\Controllers\AiSettingsController;
use App\Http\Controllers\AnnotationSyncController;
use App\Http\Controllers\AssessmentController;
use App\Http\Controllers\Auth\EmailVerificationController;
use App\Http\Controllers\CalendarBlockController;
use App\Http\Controllers\CalendarCapacityController;
use App\Http\Controllers\CalendarOccurrencesController;
use App\Http\Controllers\ClassSessionController;
use App\Http\Controllers\ClassSessionExceptionController;
use App\Http\Controllers\CommitmentController;
use App\Http\Controllers\CourseController;
use App\Http\Controllers\CourseGradesController;
use App\Http\Controllers\ExamReadinessController;
use App\Http\Controllers\GoogleCalendarCallbackController;
use App\Http\Controllers\GoogleCalendarConnectController;
use App\Http\Controllers\GoogleCalendarDisconnectController;
use App\Http\Controllers\GoogleCalendarStatusController;
use App\Http\Controllers\GoogleCalendarSyncController;
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
use App\Http\Controllers\PlanningSuggestController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\SemesterController;
use App\Http\Controllers\StudyPlanController;
use App\Http\Controllers\StudySessionController;
use App\Http\Controllers\SubmissionController;
use App\Http\Controllers\SyllabusDraftController;
use App\Http\Controllers\TaskController;
use App\Http\Controllers\TimetableImportController;
use App\Http\Controllers\TodayController;
use App\Http\Controllers\TopicController;
use App\Http\Controllers\WeeklyReviewController;
use Illuminate\Cookie\Middleware\EncryptCookies;
use Illuminate\Http\Request;
use Illuminate\Session\Middleware\StartSession;
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

// Email verification link: opened from a mail client with no session, so
// the signature is the auth, not auth:sanctum. Covers both a fresh
// signup and an email-change confirmation — see
// EmailVerificationController and User::sendEmailVerificationNotification().
Route::get('/email/verify/{user}/{hash}', [EmailVerificationController::class, 'verify'])
    ->middleware('signed')
    ->name('email.verify');

// Google OAuth callback: outside auth:sanctum on purpose — see
// GoogleCalendarConnectController's docblock. The redirect arrives from
// accounts.google.com, so Sanctum's stateful-domain check would reject
// it; the user is identified via a plain session value instead.
//
// EncryptCookies+StartSession are attached directly rather than relying
// on Sanctum's statefulApi(): that middleware only starts a session at
// all when it recognizes the request as "from the frontend" (the same
// Referer/Origin check that rejects this route for auth), so without
// this the session — and Socialite's own state-param verification,
// which also reads the session — would never be available here even
// though the browser is sending the exact same session cookie /connect
// just wrote to.
Route::get('/google-calendar/callback', GoogleCalendarCallbackController::class)
    ->middleware([
        EncryptCookies::class,
        StartSession::class,
    ]);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', function (Request $request) {
        return $request->user();
    });
    // Settings, see "Settings" in mdfile/DESIGN.md. Preferences (incl.
    // name) vs. credentials (email, password) are separate endpoints —
    // see ProfileController's docblock for why. Both credential routes
    // and destroy() are throttled: current_password re-auth makes each
    // one a password oracle if a hijacked session could hammer it freely.
    Route::patch('/user', [ProfileController::class, 'update']);
    Route::patch('/user/email', [ProfileController::class, 'updateEmail'])->middleware('throttle:6,1');
    Route::delete('/user/email', [ProfileController::class, 'cancelPendingEmail']);
    Route::patch('/user/password', [ProfileController::class, 'updatePassword'])->middleware('throttle:6,1');
    Route::post('/email/verification/resend', [EmailVerificationController::class, 'resend'])->middleware('throttle:6,1');
    Route::delete('/user', [ProfileController::class, 'destroy'])->middleware('throttle:6,1');

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

    // Calendar roadmap Phase 4a: virtual ClassSession/Commitment
    // occurrences for display — read-only, same recurrence rules the
    // capacity engine already uses.
    Route::get('/calendar/occurrences', CalendarOccurrencesController::class);

    // Foundation Phase 4: Focus sessions and work logs.
    Route::apiResource('calendar-blocks', CalendarBlockController::class);

    // Calendar roadmap Phase 5: Google Calendar two-way sync. /connect is
    // a plain browser navigation (not apiFetch), see its controller's
    // docblock — /callback is registered above, outside this group.
    Route::get('/google-calendar/connect', GoogleCalendarConnectController::class);
    Route::get('/google-calendar/status', GoogleCalendarStatusController::class);
    Route::post('/google-calendar/sync', GoogleCalendarSyncController::class);
    Route::delete('/google-calendar/disconnect', GoogleCalendarDisconnectController::class);

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

    // Read-only planning preview for the "Plan Suggestions" popup. Same
    // pipeline as /planning/run but writes nothing.
    Route::get('/planning/suggest', PlanningSuggestController::class);

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

    // Everytime (에브리타임) share-link timetable import — same
    // draft-then-confirm shape as syllabus-drafts above, see
    // EverytimeImportService.
    Route::post('/timetable-imports', [TimetableImportController::class, 'store']);
    Route::post('/timetable-imports/{import}/confirm', [TimetableImportController::class, 'confirm']);
    Route::post('/timetable-imports/{import}/discard', [TimetableImportController::class, 'discard']);
});
