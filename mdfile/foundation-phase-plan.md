# Foundation Release: Implementation Plan

Reference doc only; no code from this file yet. See `semester-command-center.md`
("Scope and cut-lines") for how this release fits the full roadmap, and
`release-roadmap.html` / `pipeline-er.html` for the visual overview.

## Requirements Restatement

Repo currently has a scaffold only (Next.js shell, Laravel with just `User` +
Sanctum tables, Docker/CI/CD wired). Build the **Foundation** release per the
plan's Scope and cut-lines table, the first slice that's actually usable
daily, with everything downstream (Planning Engine, Academic Intelligence,
Automation) depending on it:

- Today dashboard
- Timetable/capacity engine
- Courses
- Assessments as multi-day projects (not just deadlines)
- Timezone/recurrence model
- Focus sessions and work logs
- **Manual data entry only**, no planner ranking/placement yet (that's
  Planning Engine), no AI, no notifications

Auth (register/login via Sanctum) isn't named in the table but is a hard
prerequisite for every screen, included here as Phase 0.

## Implementation Phases

### Phase 0: Auth + Profile

- Migration: extend `users` (or new `profiles` table) with `timezone`,
  `max_study_hours_per_day`, `deep_work_windows` (json), `quiet_hours` (json).
- `AuthController`: register, login, logout, `/api/user` (already stubbed),
  Sanctum SPA cookie flow.
- Frontend: login/register pages, auth context/hook, protected-route
  wrapper, API client (`src/lib/api.ts`) gains actual fetch wrapper with
  credentials.
- **Complexity: Low.** Well-trodden Sanctum SPA pattern.

### Phase 1: Core data model (Courses, Semester, ClassSession)

- Migrations: `semesters` (start/end/breaks), `courses`
  (title/code/colour/instructor/credits/grade_target), `class_sessions`
  (weekly pattern) + `class_session_exceptions`, `commitments` (fixed
  personal time).
- Eloquent models + factories, ownership scoped via global scope (per
  Technical direction; no RLS, app-layer scoping).
- API: CRUD resource controllers for Semester/Course/ClassSession/Commitment,
  form request validation.
- Frontend: Courses list + course-workspace shell (tabs: Overview /
  Assessments / Materials / Revision / Grades / Insights, only Overview
  functional this phase, rest are placeholders), Semester setup flow.
- **Complexity: Medium.** Recurrence (weekly-pattern-plus-exceptions) needs
  care but the plan already specifies the model exactly.

### Phase 2: Assessments as multi-day projects

- Migrations: `grade_categories`, `grade_items`, `assessments` (optional
  `grade_item_id`), `milestones`, `tasks` (course-level, optional
  `assessment_id`/`topic_id`), `submissions`.
- `Assessment.remainingMinutes` computed accessor (sum of open Task
  `remaining_estimate_minutes`, per the plan's explicit fix, never inferred
  from logged time).
- API: Assessment CRUD + milestone/task sub-resources.
- Frontend: Assessment detail view matching the plan's mockup (milestones
  checklist, estimated/remaining effort, status).
- **Complexity: Medium.**

### Phase 3: Capacity engine (`app/Engine/`)

- Pure PHP, no Eloquent; `CapacityCalculator`: `(classSessions, exceptions,
  commitments, preferences, dateRange) → DayCapacity[]`.
- Recurrence expansion (weekly pattern + exceptions) + term-break handling,
  timezone-correct (`Profile.timezone`).
- Fixture-based PHPUnit tests in `tests/Unit/Engine/fixtures` (already
  scaffolded, empty): golden tests for DST week, holiday week, fully-booked
  day.
- API: `GET /api/calendar/capacity?from=&to=` thin controller calling the
  engine.
- Frontend: Calendar view (day/week grid) rendering capacity readout +
  lecture/commitment blocks (no CalendarBlock placement yet, that's
  Planning Engine).
- **Complexity: High.** This is the one piece the plan flags as
  highest-risk ("every downstream number is wrong if this is wrong").

### Phase 4: Focus sessions and work logs

- Migrations: `calendar_blocks` (manual only this phase, status
  suggested/accepted/moved/skipped/done, but no planner writes yet),
  `study_sessions` (planned/actual duration, outcome, notes, blocker).
- Task fields: `initial_estimate_minutes`, `remaining_estimate_minutes`,
  `actual_minutes_logged`, `completion_percent`, `estimate_confidence`.
- API: start/pause/end session endpoints, end-of-session reflection
  endpoint (updates `remaining_estimate_minutes`, never inferred from time
  logged).
- Frontend: Focus session screen (timer, goal, quick note, "I am stuck",
  end-of-session reflection).
- **Complexity: Medium.**

### Phase 5: Today dashboard

- No ranking engine yet (Planning Engine release); Today shows
  manually-entered/upcoming data only: today's classes, assessments due
  soon, any manually-created CalendarBlocks for today, a plain (unranked)
  task list.
- API: `GET /api/today` aggregating the above.
- Frontend: Today screen per the plan's mockup: greeting strip, focus list
  (unranked for now, sorted by due date as a placeholder), upcoming strip,
  workload line (raw capacity vs commitments, not the real week-state
  system, since that needs the Planning Engine's allocation output).
- **Complexity: Low-Medium.** Mostly assembly of Phases 1–4's data; the
  honest caveat (no real ranking yet) should show in copy, not be hidden.

## Dependencies

```text
Phase 0 (auth)
  └─ Phase 1 (courses/semester/class sessions)
       ├─ Phase 2 (assessments/tasks)
       ├─ Phase 3 (capacity engine) — needs class sessions + commitments from Phase 1
       └─ Phase 4 (focus sessions) — needs tasks from Phase 2
            └─ Phase 5 (Today) — needs 1, 2, 3, 4 all present
```

Phase 3 (capacity engine) can start in parallel with Phase 2 once Phase 1
lands; different data, no shared state.

## Risks

| Risk | Sev | Mitigation |
|---|---|---|
| Capacity engine timezone/recurrence bugs | High | Fixture-based golden tests before any UI touches it (plan's own Phase 0 ADR) |
| Today ships feeling like "just another task list" without the real planner | Medium | Explicit in-UI copy that ranking is basic/date-sorted until Planning Engine lands; don't let it look finished |
| Ownership-scoping bugs (no DB-level RLS, app-layer only) | High | A test asserting every new Eloquent model is scoped to the authenticated user, added in Phase 0 as a pattern the rest of the phases follow |
| Scope creep: building Planning Engine pieces "since we're here" | Medium | Hard stop at manual-only CalendarBlocks; ranking/placement is explicitly the next release, not this one |

## Estimated Complexity

- Phase 0: Low, 0.5–1 day
- Phase 1: Medium, 1.5–2 days
- Phase 2: Medium, 1.5–2 days
- Phase 3: High, 2–3 days
- Phase 4: Medium, 1–1.5 days
- Phase 5: Low-Medium, 1 day
- **Total: ~8–10 days solo**, matching the earlier estimate for the full
  Foundation→Planning Engine slice (this covers Foundation only).

## Status

- **Phase 0 (Auth + Profile): done.** Sanctum SPA cookie auth (register,
  login, logout, `/api/user`), profile fields on `users`
  (timezone/max_study_hours_per_day/deep_work_windows/quiet_hours/grade_scale),
  the reusable `BelongsToUser` ownership-scoping trait for Phase 1+ models,
  and the frontend auth context/pages/protected-route wrapper. Verified
  end-to-end through the real cookie/CSRF/CORS flow (not just unit tests):
  see commit history for the bugs that surfaced only under that check
  (Sanctum's stateful-guard switch breaking bare `Auth::logout()`, the
  Laravel 13 CSRF middleware rename, curl-vs-browser `Origin` header
  behavior).
- Phases 1–5: not started.
