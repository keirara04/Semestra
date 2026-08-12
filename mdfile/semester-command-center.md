# Semester Command Center (SEMESTRA)

## Scope and cut-lines

Scope is organized into **named capability releases**, not repeated "v1" labels scattered per feature — every feature below belongs to exactly one release, so there's one place to check what's actually buildable right now.

| Release | Contains | Depends on |
|---|---|---|
| **Foundation** | Today dashboard, timetable/capacity engine, courses, assessments as multi-day projects, timezone/recurrence model, focus sessions and work logs (manual data entry only) | — |
| **Planning Engine** | Feasibility pass, ranking, placement, plan stability (suggested/accepted/pinned), semester timeline/workload forecast, grade tracker (feeds ranking) | Foundation |
| **Academic Intelligence** | Materials library, topics, spaced revision, exam mode, AI Stage A (summaries/flashcards/explanations) | Planning Engine |
| **Automation** | AI Stage B (retrieval/attribution), AI Stage C (command interface), notifications, weekly review automation, PWA offline | Academic Intelligence |

**Explicitly deferred past all four releases, with reason:**

- **Google Calendar sync** — one-way export only when built; two-way sync semantics are undefined and out of scope until specified separately.
- **Group assessments with real multi-user accounts** — group members are text labels only (see Group work, below). Real shared assessments require a membership-based RLS redesign and are a separate project.
- **Mock-test scoring, multi-institution GPA scales, recording transcription** — not needed for the first real semester.

## Product idea

A personal academic operating system for a university student. It brings together timetable, coursework, exams, study planning, revision, notes, grades, and workload forecasting in one private workspace.

Its central promise is simple:

> Tell me what I should work on today, why it matters, and what happens if I delay it.

This is not a task-list app. It should understand the relationship between deadlines, grade weight, remaining effort, available time, progress, and revision needs.

## Target user

The first user is a third-year Computer Science student balancing lectures, coursework, reports, group work, labs, and exams. The product is university-work-only: freelance work, finances, and general life planning are intentionally outside the first product boundary.

## Product principles

- Plan realistic study time rather than filling every free calendar slot.
- Treat assignments as multi-day workloads, not one-line deadlines.
- Make risks visible early, when the schedule can still be repaired.
- Explain every recommendation in plain language.
- Adapt to missed work without guilt-driven or noisy design.
- Keep AI assistance editable, course-scoped, and transparent about its sources.
- Protect academic data with private-by-default storage and clear ownership.

## Primary navigation

```text
Today
Semester
Courses
Assessments
Calendar
Focus
Insights
Settings
```

On mobile, Today, Calendar, and Focus should be immediately accessible. Desktop should give more space to semester planning, course workspaces, and workload analytics.

## Today dashboard

The opening screen answers four questions immediately:

1. What classes do I have today?
2. Which deadlines or exams need attention?
3. What are the highest-value tasks I can realistically complete today?
4. Am I still on track for the semester?

Example:

```text
Good morning, Keemi
Wednesday, 12 August

Next event: Deep Learning lecture · 11:00–12:30

TODAY'S FOCUS
1. Finish CNN report methodology      1h 30m
2. Review Week 7 lecture notes        45m
3. Begin Database assignment query    1h

UPCOMING
• Database assignment — due in 3 days
• Deep Learning midterm — 12 days
• Group presentation — 18 days

Workload: manageable · 3.5 focused hours planned
```

The dashboard should not create impossible schedules. It must respect lectures, blocked time, sleep preferences, task estimates, and the study hours already planned.

## Semester timeline and workload forecast

The Semester view is a horizontal timeline that shows courses, assessments, exams, and workload peaks. Each course receives a consistent colour. A report or project should appear as a multi-day workload bar, rather than only a deadline point.

```text
Aug  ───────────────────────────── Sep ───────────────────────────── Oct

AI/ML       [Research proposal=======] [Midterm]    [Final project========]
Database              [Assignment====]       [Quiz]       [Final]
Algorithms     [Problem set==] [Problem set==]          [Final exam]

Workload       ▂▃▅▆▇▆▃▂         ▃▄▆▇▇▅▃
```

Week states, defined as the ratio `allocated hours ÷ recommended capacity hours` for that week — **allocated hours come from the planner's output (see Smart study planner), not from raw remaining effort per assessment**, since three assessments can each look individually safe while being collectively impossible. This makes the Semester timeline a downstream view of the planner, not an independent read of raw data:

- **Comfortable:** ratio ≤ 0.7
- **Busy:** ratio 0.7–1.0
- **At risk:** ratio 1.0–1.3
- **Critical:** ratio > 1.3, or a deadline falls before its latest-safe-start under current allocation.

(Thresholds are defaults, adjustable in Settings; the exact numbers should live in one constants file in code, not be hardcoded per view.)

## Course workspace

Every course has its own workspace:

```text
Deep Learning
Professor · weekly class time · credits · grade target

Overview | Assessments | Materials | Revision | Grades | Insights
```

Each course includes:

- Syllabus, instructor details, timetable, colour, credits, and grade target.
- Assessment breakdown: reports, quizzes, labs, projects, participation, midterm, and final.
- Grade weighting and projected final-grade calculation.
- Lecture materials: slides, PDFs, readings, recordings, notes, and useful links.
- Learning objectives and topics organised by week.
- Planned versus completed study time.
- Topic confidence and revision coverage.
- Course-specific insights such as unreviewed material or upcoming high-weight assessments.

## Assessment and project planner

An assessment is a structured project, not only a to-do item.

```text
Korean Sign Language Report
Course: Deep Learning
Weight: 30%
Due: 28 September, 23:59
Estimated effort remaining: 14 hours
Status: At risk

Milestones
✓ Choose topic
✓ Read 5 sources
• Draft methodology        2h
• Build experiment         5h
• Write findings           4h
• Edit + references        3h
```

Required assessment fields:

- Type, course, due date, grade weight, status, and submission URL.
- Estimated and remaining effort.
- Milestones, subtasks, and dependencies.
- Group members and ownership, when applicable.
- Files, GitHub links, Google Drive links, and relevant materials.
- Work log with actual time spent.
- Risks and blockers.

Recommended start date and latest safe start date are **not computed per-assessment in isolation** — that lets several assessments each report "you have room" while collectively overbooking the same hours. They are read off the single global planner pipeline defined in Smart study planner, below (specifically, off the feasibility pass), which removes the circularity of "start dates depend on allocation, but allocation depends on start dates" by fixing one pipeline order.

```text
Recommended start: 10 September
Comfortable pace: 1.5 hours across 9 days
Latest safe start: 17 September (includes 20% buffer)
```

## Smart study planner

This is Semestra's hardest and most valuable feature. Treat it like a financial calculation engine: **deterministic, explainable, and testable** — never a schedule that merely looks reasonable.

### Core concepts

- **Capacity** — study minutes schedulable in a given time window (from the capacity engine, see Timetable and availability).
- **Demand** — remaining task minutes due before a given date.
- **Slack** — available capacity before a due date minus demand before that due date. Negative slack means infeasibility.
- **Feasibility** — whether all *mandatory* demand (hard-deadline work) can fit before its deadlines, given capacity and other mandatory demand competing for the same hours.
- **Recommendation** — a proposed calendar block, placed only after feasibility for mandatory work is already preserved.

The key rule: **priority never decides whether a hard-deadline task gets enough time.** Priority only decides which *safe, flexible* work fills the slots left over once mandatory work is reserved. A greedy "highest score first" placement without this separation can look reasonable while quietly starving a low-ranked task with an earlier hard deadline of the time it needs.

### Fixed pipeline order

The planner runs these steps in this order, every time — this fixes the circular dependency between allocation and start-date/risk data:

1. **Calculate capacity** — expand timetable, commitments, breaks, and preferences into available study minutes per day (see Timetable and availability).
2. **Calculate demand and slack** — for every open task, compute remaining minutes and slack against its due date (or its parent assessment's due date).
3. **Determine feasibility and latest-safe-start** — backward-schedule every task with a hard deadline (see below) to test whether all mandatory demand fits. This produces each assessment's `recommendedStart` / `latestSafeStart` (and answers Assessment planner's start-date question) and marks infeasible work **Critical**.
4. **Reserve hard-deadline work** — commit the capacity that backward-scheduling assigned to mandatory work.
5. **Rank flexible work** — score everything that isn't mandatory-and-already-reserved (see Ranking, below).
6. **Place suggestions** — greedily fill remaining unreserved capacity with ranked flexible work (see Placement, below).

The backward-reservation step (4) is what stops a large report due Friday from losing its required slots to a pile of small, high-scoring tasks — without it, ranking alone cannot guarantee a hard deadline is met.

### Ranking

Ranking decides which *flexible* work gets the next open slot — it does not decide whether mandatory work is scheduled at all (see pipeline above). Score is a **bounded, clamped weighted sum**, not a multiplicative or log-additive formula — multiplication lets one near-zero factor erase an important task, and an unbounded log formula still needs the same normalization work without the debugging benefit of a fixed 0–100 range:

```text
score = urgency_score        × 0.40
      + academic_impact      × 0.20
      + effort_risk          × 0.15
      + staleness            × 0.15
      + revision_need        × 0.10
```

Every factor is **clamped to 0–100** with an explicit input range, default, and missing-data fallback, defined in one constants file in code (not hardcoded per view):

- **urgency_score** — from `remainingMinutes ÷ availableMinutesBeforeDue`, clamped 0–100 (100 = no slack left). Missing due date → treated as a flexible task with a fixed low default (e.g. 10), never zero.
- **academic_impact** — from parent assessment's grade weight × gap to course target grade, clamped 0–100. Non-graded tasks (e.g. plain reading) default to a fixed baseline (e.g. 20), not 0.
- **effort_risk** — from remaining-estimate size and `estimate_confidence` (low confidence and large estimates score higher, so they don't get left too late), clamped 0–100.
- **staleness** — replaces the old separate "progress gap" and "delay penalty," which double-counted the same signal (a task with no progress *is* a repeatedly postponed task). One factor: time since last touched relative to remaining runway, clamped 0–100.
- **revision_need** — from topic confidence and days since last review for revision-linked tasks, clamped 0–100; 0 for non-revision tasks.

Start with these fixed weights. Do not begin with a log-based or otherwise mathematically clever formula unless real acceptance/completion data proves it schedules better than this bounded, explainable version — a recommendation engine students can trust beats a mathematically sophisticated one they can't.

Dependencies between tasks constrain ordering (a dependent task cannot be placed into an earlier slot than its blocker) but are not part of the score itself. **Dependency cycles are rejected at creation time**, not discovered at planning time.

### Placement

Greedy placement of ranked flexible work into whatever capacity the feasibility pass (step 3) did not already reserve, respecting:

- **Minimum viable block length per task** — a task cannot be split into blocks smaller than this.
- **Maximum splits per task** (configurable).
- Preferred deep-work windows as a soft preference, not a hard constraint.
- Dependency ordering across days.
- **Pinned blocks are never moved.** Any block the student has accepted, or a session already in progress, is excluded from re-placement — and **counts as committed capacity even if not yet completed**. The planner only fills remaining unreserved, unpinned capacity. This is what keeps daily re-planning from reshuffling a day the student already committed to.
- **Manual calendar moves persist as intentional changes** — a block the student manually moved is treated the same as pinned; the next replan must not silently move it back or elsewhere.

### Edge cases (defined now, not discovered later)

- A task has a fixed start date, a hard deadline, or neither — placement logic must handle all three, not assume every task has a deadline.
- **Skipped blocks return their demand to the planner** for the next run; **completed blocks reduce remaining effort only when the student confirms progress** — a block simply ending does not imply the work is done (see Focus sessions for the completed/partial/blocked reflection that drives this).
- **If the plan is infeasible, Semestra must not invent a schedule anyway.** It shows the deficit plainly: *"You need 12 hours before Friday but only have 7.5 available."* This is what makes an assessment Critical immediately (pipeline step 3), not only once the date is close.

### When it runs

On demand (student requests a re-plan) and once nightly. A run only re-derives `suggested` blocks; `accepted`/`in-progress`/manually-moved blocks are untouched (see Placement, above). Every planner run is versioned — see Core data model for the `planner_run_id` / `explanation_snapshot` fields that make "why did it suggest this yesterday" answerable after the underlying data changes.

It must show its reasoning — each factor's weighted contribution, in plain language — and let the student accept, move, split, skip, or reschedule tasks.

```text
Suggested because:
- Due in 3 days and only 4.5 hours remain: high urgency.
- Worth 30% of the course grade: high impact.
- Not worked on for 6 days: rising staleness.
- You still have enough capacity before the deadline: feasible.
```

### Consequence of delay

The product's differentiator is stating what delay costs, so it must be one concrete, computable thing rather than generic urgency copy. Definition: *delaying this block's hours pushes them into a later week; recompute that week's allocated ÷ capacity ratio with the pushed hours included, and state the resulting week state and, if it crosses Critical, the days by which latest-safe-start would then be missed.*

```text
Example: "Delaying this 2h block pushes it into next week, which is
already at 92% capacity — that would push it to 118% (At risk)."
```

```text
Suggested plan for Thursday

09:30–10:45  Database assignment: normalize schema
14:00–15:30  Deep Learning: experiment setup
20:00–20:45  Algorithms: revise dynamic programming

Why this plan?
• Database is due in 3 days and has 4 hours left.
• Deep Learning is high-weight and has not progressed this week.
• Algorithms revision maintains spacing before the midterm.
```

## Timetable and availability

The calendar combines academic commitments and realistic study capacity.

Inputs:

- Lectures, tutorials, labs, and exams.
- Fixed commitments and commuting.
- Sleep, meals, gym, prayer, and personal blocked time.
- Maximum study hours per day.
- Preferred deep-work times.
- Days or periods with no study allowed.

The planner calculates capacity instead of pretending every empty hour is productive:

```text
Tuesday
Lectures: 4h
Personal commitments: 2h
Available time: 5h
Recommended focused-study capacity: 3h 30m
Already planned: 2h 45m
```

## Time, dates, and recurrence

Every deadline, class, quiet hour, and "today" boundary depends on this being right, so it is a schema-level decision made up front, not retrofitted:

- Single timezone per student, stored on `Profile.timezone`. All "day" boundaries and capacity math are computed in that timezone.
- All timestamps stored as `timestamptz` in the database.
- `ClassSession` recurrence is weekly-pattern-plus-exceptions (not RRULE): a base weekly pattern plus a table of exceptions (cancelled, moved, one-off room/time change).
- `Semester` carries `startDate`, `endDate`, and a list of term breaks/holidays (`academic_calendar_exceptions`). Capacity calculations must exclude break periods.

## Focus sessions and work logs

Focus sessions begin from a real planned task.

```text
Deep Learning · Build experiment
Planned: 90 minutes
Goal: complete data preprocessing pipeline

[ Start focus session ]
```

Features:

- Pomodoro and custom durations.
- Distraction-free task view.
- Goal and definition of done.
- Quick note capture.
- Pause/resume.
- A visible “I am stuck” option that logs a blocker.
- End-of-session reflection: completed, partly completed, blocked, longer than estimated, or easier than estimated.
- Actual-duration tracking and updated remaining effort.

This feedback improves future workload predictions.

## Materials, notes, and revision

Course materials should be searchable and connected to topics and assessments:

- Lecture slides, PDFs, readings, recordings, notes, and links.
- Tags for course, week, topic, and assessment.
- Topic confidence: Not started, Learning, Comfortable, Confident.
- Last reviewed and next-review dates.
- Suggested spaced reviews after one, three, and seven days, plus pre-exam review.
- **A daily review cap** (default: configurable in Settings, e.g. 45 minutes), so review debt cannot silently exceed study capacity as topics accumulate over the semester.
- **A backlog rule for missed reviews:** a missed review is not duplicated onto the next day. Instead it merges into the next scheduled review for that topic, and confidence decays one step if more than one review is missed.

Revision items are schedulable work: they enter the same ranking queue as assessment tasks (see Smart study planner), not a separate silo — otherwise the planner can't actually account for them against capacity.

The goal is not to replace Anki. It is to maintain enough revision structure that important topics do not disappear after a lecture.

## AI study assistant

AI is an assistant for organising and practising material, not a source of unverified answers.

Capabilities:

- Create editable summaries from selected materials.
- Generate flashcards, self-test questions, and revision guides.
- Explain a concept at beginner, exam, or implementation depth.
- Turn an assessment brief into milestones and unanswered questions.
- Review a report outline for gaps.
- Help estimate complexity and remaining work.
- Keep chats scoped to a course or assessment.

Guardrails:

- Show which course materials were used.
- Make all generated content editable.
- Clearly mark generated material as AI-assisted.
- State when sources are incomplete or unreadable.
- Avoid claiming factual correctness without supporting material.

### AI operations (v1 constraints)

- API key handled **server-side only** — inside the Laravel API, in an environment variable, never shipped to the Next.js frontend or client.
- Hard token budgets: per-day and per-request caps, enforced before the call, with remaining budget visible to the student.
- Generated artifacts cached by `(materialVersion, prompt, model)` so repeat requests don't re-spend budget.
- **v1 is Stage A only: no retrieval.** Requests are scoped to explicitly student-selected materials, not a background index. Chunk-level "which materials were used" attribution implies retrieval (pgvector embeddings + chunking pipeline) — that's a separate project (Stage B), not a v1 guardrail bullet.
- PDFs need server-side text extraction; scanned/image-only slides (OCR) and recording transcription are **out of scope for v1**.

### Stage C — AI command interface (after Stage A, deferred until Stage A is proven)

A conversational way to mutate the student's data with natural language instead of forms — "add a Deep Learning report due 28 September, 30% weight" or "cancel today's Algorithms lecture" should create the assessment or write the schedule exception directly, with everything downstream (capacity, planner, Today) recomputing naturally.

Mechanism: **function-calling, not freeform generation.** The model parses intent and calls a fixed set of typed functions that wrap the same engine/data-access layer the UI itself uses (`createAssessment`, `updateAssessment`, `createTask`, `markClassSessionCancelled`, `logStudySession`, …). The model never writes SQL or touches the database directly, so it cannot do anything a human couldn't already do through the UI.

Guardrails:

- **Confirm before write.** Show the parsed intent as a plain-language preview ("Cancel Deep Learning lecture, 12 Aug — frees 1h 30m today") and require explicit accept before the mutation commits, especially for anything that reshuffles the plan or touches a due date.
- **Scoped function set.** The available functions are an explicit allowlist, not general data access — no bulk deletes, no cross-course actions, no account/billing/settings changes via chat.
- **Ambiguity fallback.** If course, date, or assessment can't be resolved with confidence (e.g. two courses share a similar name), ask a clarifying question rather than guessing.
- **Same cost/budget model as Stage A** — server-side key, per-day/per-request token caps, visible remaining budget.
- Every chat-originated mutation is tagged `source: ai_command` in its record, same spirit as the `ai_generated` flag on Stage A content, so the student can always see what changed and why.

## Exam mode

An exam gets a focused preparation workspace.

```text
Database Systems Midterm
12 days remaining

Coverage
✓ ER modeling
✓ Normalization
• SQL joins
• Transactions
• Indexing

Readiness: 58%
Target study time remaining: 12 hours
Suggested pace: 1 hour/day + 2-hour weekend review
```

Exam mode combines topics from the syllabus, self-rated confidence, lecture coverage, mock-test scores, past-paper links, planned review sessions, and time remaining. It should prioritise weak and unreviewed topics early.

**Readiness formula (v1):** confidence-weighted topic coverage — `readiness = Σ(topic confidence score × topic weight) ÷ Σ(topic weight)`, where confidence score maps Not started/Learning/Comfortable/Confident to 0/0.33/0.66/1, and topic weight defaults to equal unless the syllabus states otherwise. Mock-test scores are out of scope for v1 (no scoring model defined yet) and are not part of the v1 formula.

## Grade and outcome tracker

`GradeItem.weighting` is the **single canonical source** of grade weight — `Assessment` links to a `GradeItem` rather than storing its own duplicate weight, which would drift.

Each course provides weighted grade forecasting:

```text
Current standing: 82%   (of completed weight only)
Target: A / 85%

Completed work
Quiz 1 — 17/20
Assignment 1 — 24/30

Remaining
Midterm — 25%
Final — 25%

To reach 85% overall:
Need approximately 87% average across remaining work.
```

**Explicit formulas (v1):**

- **Current standing** = `Σ(achieved score × weighting) ÷ Σ(weighting of completed items)` — i.e. normalized over completed weight only, not assuming target performance on the rest. Displayed with a "(of completed weight)" label so it's never ambiguous with the projected figures below.
- **Best-case** = current standing assuming 100% on all remaining items. **Conservative** = current standing assuming the student's own historical average (or course average if no history) on remaining items. **Expected** = current standing assuming the course target grade on remaining items.
- **Needed average** = weight-solve for the remaining-work score that hits the target, given current standing on completed weight.
- **Unknown/pending grades** are excluded from "completed weight" until entered — they do not count as zero.
- **Drop-lowest / best-N-of-M rules** are declared per assessment-group at course setup (e.g. "best 8 of 10 labs") and applied before weighting.
- **Pass hurdles** (e.g. "must score ≥40% on the final") are declared per assessment and surfaced as a separate pass/fail check, independent of the weighted average.
- If a course's weights don't sum to 100%, normalize by the declared total rather than erroring, and flag it visibly in the course workspace.

Features:

- Weighted grade calculations, per the formulas above.
- Best-case, expected, and conservative outcomes.
- Unknown and pending grades.
- **GPA projection across all courses, against a single configurable grade scale** set in Settings (e.g. 4.0/4.3/5.0) — multi-institution/multi-scale support is deferred.
- Visibility into the assessments with the greatest effect on the final grade (weight × remaining uncertainty).
- Feeds the academic-impact factor in the Smart study planner's ranking.

## Weekly review

Once a week, the system should prompt a short academic reset:

```text
Weekly review

Planned: 14 hours
Completed: 10h 20m

What caused the difference?
• Underestimated assignment
• More lectures than expected
• Personal commitments
• Procrastinated
• Other

Next week is at risk because:
• Two assessments overlap
• Deep Learning report needs 7 hours
• Exam revision has not started
```

It then recalculates the next week from reality rather than preserving an outdated plan.

## Notifications

Notifications should be useful and configurable, never motivational spam.

- “Your Database assignment needs 2 hours today to remain on track.”
- “Deep Learning report is at risk: 8 hours remain across 3 available hours.”
- “You have not reviewed CNNs for 7 days.”
- “Tomorrow has 6 hours planned after lectures; consider moving one task.”
- “Your exam is 10 days away; SQL joins remain marked as shaky.”

Settings should include quiet hours, warning thresholds, delivery channels, and course-specific notification controls.

**v1 implementation constraints:**

- Runtime: Laravel's task scheduler (`schedule:run` on a system cron entry) dispatching jobs onto the Redis queue, processed by a queue worker — internal to the API, not a publicly invocable endpoint.
- **One delivery channel in v1: email.** Web push is deferred — it needs VAPID setup and, on iOS, the PWA must be installed to home screen first, which is too much surface for v1.
- Every notification carries an **idempotency key** (e.g. `hash(userId, type, subjectId, date)`) so a cron re-run or retry cannot send a duplicate.
- Quiet hours and thresholds are evaluated in `Profile.timezone` (see Time, dates, and recurrence).

## Core data model

`CalendarBlock` and `StudySession` are resolved into one canonical split: **`CalendarBlock` owns time** (a slot on the calendar — lecture, commitment, or planned study, with a `status` of suggested/accepted/moved/skipped/done), and **`StudySession` is the execution record** referencing a block (actual duration, outcome, notes, blocker). A block can exist without a session (not yet worked); a session always references a block.

`Task` is promoted to **course level** with optional links to `Assessment` and `Topic`, rather than sitting only under `Assessment` — otherwise revision items and ad-hoc reading (which the Today dashboard shows alongside assessment work) have nowhere to live and can't enter the same ranking queue.

```text
Profile (one per student: timezone, preferences, grade scale)

Semester (startDate, endDate, breaks)
 ├─ Course
 │   ├─ ClassSession (weekly pattern) ─ ClassSessionException
 │   ├─ Topic ──┬── (join) TopicMaterial ── Material
 │   │          └── (join) AssessmentTopic ── Assessment
 │   ├─ Material
 │   ├─ Assessment (links to one GradeItem — canonical weight owner)
 │   │   ├─ Milestone (estimate = authored, or sum of its Tasks — declared per milestone)
 │   │   ├─ Submission
 │   │   └─ (join) AssessmentMaterial ── Material
 │   ├─ GradeItem (weighting lives here; Assessment links to it, does not duplicate it)
 │   └─ RevisionItem (schedulable — enters Task queue, see below)
 ├─ Task (course-level; optional assessmentId, optional topicId — unifies assessment
 │        work, revision items, and ad-hoc reading in one schedulable, rankable set)
 ├─ CalendarBlock (owns time: lecture | commitment | study; status: suggested |
 │                  accepted | moved | skipped | done)
 │   └─ StudySession (execution record: planned/actual duration, outcome, notes, blocker)
 ├─ Commitment (fixed personal time: sleep, meals, gym, prayer, commuting)
 ├─ StudyPlan (a planner run's output — the set of suggested CalendarBlocks)
 ├─ Notification (idempotency key; see Notifications)
 └─ WeeklyReview
```

Important fields:

- `Profile`: timezone, max study hours/day, deep-work windows, grade scale, quiet hours.
- `Course`: title, code, colour, instructor, credits, grade target.
- `Assessment`: type, due date, gradeItemId, estimatedHours, **remainingHours (derived — recomputed on read from open Tasks/Milestones minus logged StudySession time; not an independently-editable stored value)**, status. Group members, when applicable, are **text labels only in v1** (see Group work).
- `Task`: course, optional assessment, optional topic, estimated duration, dependency, priority, completion state.
- `CalendarBlock`: type (lecture/commitment/study), status (suggested/accepted/moved/skipped/done), start, end.
- `StudySession`: references CalendarBlock; planned duration, actual duration, outcome, notes, blocker.
- `Topic`: confidence, last-reviewed date, next-review date.
- `GradeItem`: maximum score, achieved score, weighting (canonical), expected score, drop-lowest/best-N-of-M group, pass-hurdle threshold.

### Group work (v1 decision)

Group members are **plain-text labels with no accounts** — no shared login, no cross-user visibility, no invitation flow. This keeps ownership scoping simple everywhere: every query is already scoped to the authenticated user via the Eloquent global scope (see Technical direction), so there's no cross-user access path to guard against. Real shared multi-user assessments (each group member has their own account and sees the shared item) would require a membership table, per-field visibility policy, and notification fan-out — a different, deferred project (see Scope and cut-lines).

## Technical direction

**Frontend and backend are separate deployments**, talking over a JSON API — not a monolith.

- **Frontend:** Next.js, TypeScript, Tailwind CSS. Consumes the Laravel API over HTTPS; no direct database access from the frontend.
- **Backend:** Laravel (PHP) as a JSON API — controllers/resources only, no Blade views. Auth via **Laravel Sanctum** (SPA token auth — the standard Sanctum use case for exactly this separate-frontend shape).
- **Database:** **DigitalOcean Managed PostgreSQL.** Stays Postgres (not MySQL) specifically so `pgvector` is available for AI Stage B retrieval later, and because the spec's data model (JSON columns, generated/derived fields) fits Postgres better than MySQL.
- **Authorization model:** Laravel doesn't get Supabase's automatic row-level security, so ownership scoping moves to the **application layer** — every model gets a global Eloquent scope constraining to the authenticated user, backed by **Laravel Policies** on every controller action. This replaces the earlier "RLS at `user_id = auth.uid()` everywhere" default; the guarantee is the same (nothing crosses users), the enforcement point moves from the database to the app. (Optional hardening later: Postgres RLS can still be layered on top since DO Managed Postgres is real Postgres — not required for v1.)
- **File storage:** **DigitalOcean Spaces** (S3-compatible) for materials upload, replacing Supabase Storage.
- **Planning engine:** server-side workload and priority calculations, with transparent reasons attached to every recommendation. Lives in the Laravel API, not the frontend.
- **Calendar:** internal timetable first, with optional Google Calendar import/export.
- **AI:** OpenAI API for course-scoped summaries, quizzes, explanations, and planning suggestions, called from the Laravel API. See AI operations for cost/security constraints.
- **Notifications:** Laravel's built-in **task scheduler** (cron-driven) plus a **queue worker** (Redis-backed) running as a separate DigitalOcean App Platform component or droplet process — replaces Vercel Cron. See Notifications for runtime/channel decision.
- **PWA:** offline access to Today, calendar, focus sessions, and saved notes. See Offline and sync below — offline is a read-only snapshot plus append-only writes, not full offline functionality.
- **Privacy:** private-by-default academic data, no sale or sharing of user data, and a clear export/delete path.
- **Planning engine boundary:** the capacity, ranking, placement, grade, and forecast calculations live in a pure, framework-agnostic PHP module (plain classes/services, not Eloquent models), covered by fixture-based unit tests (PHPUnit/Pest). Controllers and Eloquent code never duplicate this logic.

### Hosting and domain

- **DigitalOcean App Platform** for both the Next.js frontend and the Laravel API as two separate app components (managed builds/deploys, no server ops) — the default recommendation for a solo build. A droplet + Nginx (optionally via Laravel Forge) is the fallback if App Platform's limits become a problem, but isn't needed to start.
- **Subdomain layout under the project's existing domain:** frontend at the bare domain or `app.<domain>`, API at `api.<domain>`, DNS `A`/`CNAME` records pointing at the App Platform (or droplet) endpoints. Keeping the API on its own subdomain (rather than `/api` behind the same host) is what makes CORS + Sanctum's SPA cookie/token auth straightforward — Sanctum's stateful-domain config expects exactly this split.
- Redis (for the queue worker and any caching) runs as a DigitalOcean Managed Redis instance or an App Platform component — not on the same process as the API.

### Offline and sync (v1 constraints)

- **Read-only offline** for Today, calendar, and notes: served from a cached snapshot with a visible "as of {timestamp}" indicator. The planner is server-side, so offline Today cannot be live — this is stated in the UI, not implied as full functionality.
- **Append-only offline writes** for focus sessions, work logs, and new notes: queued locally and replayed on reconnect. Append-only avoids most conflict scenarios by construction.
- **Note edits offline** are the one real conflict surface: last-write-wins, with the losing version retained (not discarded) and a conflict banner shown.
- **Offline auth:** if the Sanctum token can't be validated against the API (no network), degrade to read-only-from-cache rather than forcing a login screen — otherwise offline mode locks the student out of exactly the features it was meant to provide.

## Design direction

Avoid both the generic Notion-clone look and a childish gamified planner. The interface should feel like a calm academic control room:

- Warm off-white or soft-slate foundation.
- One consistent colour per course, chosen from a palette pre-validated for contrast against the off-white/slate foundation.
- Dense but highly readable information design.
- Colour used sparingly to communicate workload risk, **paired with a non-colour encoding (label or icon) for the four week states** — colour alone is not an accessible signal.
- Strong typography for dates, hours, deadlines, and course names.
- Minimal animation and no guilt-heavy streak mechanics.
- Mobile-first daily planning; desktop-first semester planning.

## Success criteria

Since this is a decision-support product, whether the recommendations are actually good is measurable and should be tracked from v1:

- ≥70% of suggested calendar blocks are accepted without being moved.
- Per-course estimation bias narrows to within ±20% of actual by week 6 (see Focus sessions).
- No assessment reaches its due date without having crossed "At risk" or "Critical" with enough lead time to react.
- Today dashboard loads in under 1 second against a real semester's data.

## Name recommendations

### Strongest options

1. **Termwise** — calm, academic, and suitable if the product grows beyond one university.
2. **CourseSignal** — emphasises early warnings and decision-making rather than task collection.
3. **StudyOrbit** — suggests the whole semester organised around the student.
4. **Semestra** — concise, polished, and clearly semester-focused.
5. **TrackTerm** — direct and easy to understand.

### More technical / developer-friendly

- **SyllabusOS**
- **CampusFlow**
- **Gradient**
- **CourseMap**
- **StudyStack**

### More personal and calm

- **ClearWeek**
- **OnTrack**
- **Daymark**
- **Termline**
- **Focus Semester**

### Recommendation

Use **CourseSignal** if the standout feature is workload forecasting and risk alerts. Use **Termwise** if you want a wider, friendlier student-product brand.

### Decision

**Semestra** — the repository, package name, and copy already use it; resolving this before Phase 0 scaffold avoids a rename touching the schema, deploy config, and UI copy later.
