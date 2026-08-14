# Semestra: Field Notes design system

## The idea

> Semestra is an explainable workload co-pilot for demanding university semesters. It does not just track deadlines; it tells students whether their plan is feasible and how to recover when it is not.

Every screen in this system should be judged against that sentence, not against "is this a nice planner." **Field Notes** makes Semestra feel like a precise academic notebook rather than a generic productivity app. It should help a student read a difficult semester at a glance, decide what deserves attention next, and trust the plan when their workload changes.

The visual tension is intentional:

- **Notebook-like**: warm paper, quiet rules, compact annotations, and human judgement.
- **Engineering-like**: strong hierarchy, measurable capacity, exact time, and legible data.

It is for students carrying several serious modules, overlapping coursework, and limited energy, not for collecting streaks or decorating a to-do list.

## Product model expressed in the interface

The planning pipeline should be visible in the product without exposing database language to students.

| Product entity | What it becomes in the interface | Rule |
| --- | --- | --- |
| Course | A persistent, colour-coded lane and course identity | A course colour identifies the lane; it never by itself communicates urgency. |
| Assessment | A dated milestone on its course lane | Show title, weighting, due date, and risk when useful. |
| Topic | Optional study context | Appears in task detail and focus plans, not as a competing top-level timeline object. |
| Task | The single schedulable unit | Tasks are the work blocks the planner can place, move, estimate, or mark complete. |
| StudyPlan | The planner's proposed arrangement | Present this as a plan run with a timestamp and a clear explanation of what changed. |
| CalendarBlock | A placed block of work in time | It is the bridge between a task and the student's actual calendar. |
| StudySession | What actually happened | Used for focus history, duration, outcome, and later estimates, not cluttering the semester map. |

This matches the pipeline's central decision: **Assessment, Topic, and Course work converge into Task; Task is the only schedulable unit.**

`priority_score` should be translated into an explanation such as “due soon + 95 min remaining + heavy week ahead,” rather than displayed as an unexplained permanent number. A student should be able to inspect why the plan put something first.

## Primary navigation

Eight destinations, matching the product plan exactly: nothing in the interface should require a name that isn't one of these:

```text
Today · Semester · Courses · Assessments · Calendar · Focus · Insights · Settings
```

| Destination | What it is | Field Notes surface |
| --- | --- | --- |
| Today | Opening screen: what's next, what's due, what to work on, whether the semester's on track | See **Today dashboard**, below |
| Semester | The term-long course-lane view | The **semester map** (already specified) |
| Courses | Per-course workspace: overview, assessments, materials, revision, grades, insights tabs | Course lane → detail view |
| Assessments | Flat list of every assessment across courses, sortable by risk/due date | Card list, not a new diagram language; reuse the assessment marker's detail treatment as a list row |
| Calendar | Day/week scheduling surface where CalendarBlocks are placed and dragged | See **Calendar view**, below, distinct from the semester map, which is term-long, not day-granular |
| Focus | The execution screen (already specified) | **Focus session** |
| Insights | Course-specific and cross-course analytics: unreviewed material, upcoming high-weight work, estimation bias | See **Insights**, below |
| Settings | Quiet hours, thresholds, channels, grade scale, preferences | See **Settings**, below |

**Desktop rail** (224–240 px, deep charcoal) lists all eight in this order, grouped as: Today/Semester/Calendar (planning), Courses/Assessments (structure), Focus/Insights (execution + review), Settings pinned at the bottom, separated by a hairline.

**Mobile bottom nav** compresses to five slots: the plan calls out Today, Calendar, and Focus as needing to stay one tap away on mobile:

```text
Today · Calendar · Focus · Courses · More
```

`More` opens a sheet listing Semester, Assessments, Insights, Settings. Focus keeps its full-screen mode reachable from the bottom nav even mid-session (see Focus session).

## Brand character

Semestra is:

- calm under academic pressure;
- analytical, but never cold;
- candid about risk;
- quietly personal rather than aggressively gamified.

Avoid generic SaaS signals: glass panels, gradient blobs, oversized rounded cards, achievement confetti, and dashboard metrics with no decision attached. The signature moment is the **semester map**: a restrained, course-lane view that makes workload collisions obvious before they become emergencies.

## Colour

Use a paper-and-ink base with restrained academic pigments. Apply colour with discipline, most of the screen stays neutral so a risk or a planned block has meaning.

| Token | Value | Purpose |
| --- | --- | --- |
| `--canvas` | `#EFEDE7` | App backdrop; warm ledger-paper ground. |
| `--paper` | `#F8F7F3` | Surfaces, sheets, and focused reading areas. |
| `--ink` | `#222933` | Primary text, axes, borders, and navigation icons. |
| `--muted` | `#68707B` | Secondary labels and quiet metadata. |
| `--rule` | `#CDD0CF` | Grid lines, dividers, and notebook rules. |
| `--sidebar` | `#20262E` | Desktop navigation rail. |
| `--cobalt` | `#2857A0` | Planned work, active selection, and the primary course lane. |
| `--oxide` | `#AE4D40` | At-risk work and urgent exceptions. |
| `--sage` | `#64816C` | On-track progress and a course lane option. |
| `--ochre` | `#B68A2C` | Busy/attention-needed work and a course lane option. |

Course colours distinguish courses, not status. Support every coloured marker with its course code, a label, or a pattern. Risk uses a small oxide outline or hatch plus the text **At risk**, never a large red page.

## Typography

Use two functional type voices.

- **UI and headings:** `DM Sans` (fallback: `Inter`, system sans). Clear, compact, and friendly enough for everyday use.
- **Data, dates, codes, and time:** `IBM Plex Mono` (fallback: `ui-monospace`, `SFMono-Regular`, monospace). It gives the map and planner the quiet precision of a field log.
- **Optional annotation only:** `Caveat` or a similarly legible handwritten face. Use only for non-essential observations such as “high-load week”; never for controls, dates, values, or instructions.

Suggested scale: page title `32/38`, section title `20/26`, body `15/22`, navigation `14/20`, data label `12/16` in mono, micro-label `11/14` in mono with modest tracking. Avoid all-caps except compact category labels such as `WEEK`, `CURRENT FOCUS`, or `FIELD NOTES`.

## Desktop composition

The reference composition is a desktop sheet with a dark left rail and a large, calm planning surface.

- Navigation rail: 224–240 px wide, deep charcoal, fixed on wide screens. Brand at the top; the eight primary destinations grouped beneath per **Primary navigation**, above; semester identity or quick notes at the bottom.
- Main sheet: `--paper` on `--canvas`, 32–48 px inner padding, 12–16 px corner radius, and a restrained shadow only when it sits above the app backdrop.
- Header: a small mono eyebrow, a plain-language page title, then the one action that matters on that page.
- Semester map: a fixed course-identity column at left and a horizontally measurable week grid at right. Keep the course labels and week heading visible while a large map scrolls.
- Workload strip: placed directly beneath the map, using stacked weekly hours and a lightly drawn target range. It answers “is this week feasible?” without becoming a separate analytics dashboard.

The first desktop screen should favour the map over cards. Cards belong in detail views, task inboxes, and plan explanations; the map is a diagram, not a card grid.

## Semester map rules

Each course gets one lane. A lane contains:

- course code and short name;
- a narrow identifying colour bar;
- milestone points for assessments;
- solid lines for confirmed/planned work and restrained dashed segments for projected or unscheduled work;
- compact labels that appear only at meaningful points, never every week;
- an accessible details action that opens the related course, assessment, or task.

Render a standard term as 14–16 weeks plus an exam period. Dates remain inspectable even when the map is compressed. Avoid false precision: a task estimated at 90 minutes may be shown as a block, but it must still reveal its estimate and source in details.

### Week-state system

The plan defines four week states by allocated-vs-capacity ratio, and requires each to be legible without colour. Colour alone (sage/ochre/oxide) only gives three reliable steps, so add a second channel (border weight and a mono micro-label) to cover all four without inventing a fourth hue:

| State | Colour | Non-colour encoding | Label |
| --- | --- | --- | --- |
| Comfortable | none (plain `--rule` outline) | no marker | none shown: silence is the signal |
| Busy | `--ochre`, thin fill | small filled dot, top-right of the week column | `BUSY` micro-label |
| At risk | `--oxide`, outline only | dashed outline | `AT RISK` micro-label |
| Critical | `--oxide`, filled hatch | diagonal hatch fill (existing rule) | `CRITICAL` micro-label, bold |

This is the same treatment used for the Today dashboard's workload verdict line, one system, applied at both the single-day and per-week granularity, not two.

The same condition must always be available in text, e.g. "Week 12: 23 planned hours, 5 above your target range."

## Today dashboard

Today is the opening screen, the one place the product's central promise ("what should I work on, why, and what happens if I delay it") has to land in under a second of scanning. It is not a smaller semester map; it's a different object entirely: a short, ranked, explained list.

Layout, top to bottom:

- **Greeting strip**: plain-language date, mono eyebrow for the day (`WED · 12 AUG`), and the next timetabled event inline (`Next: Deep Learning lecture · 11:00–12:30`). No illustration, no weather-app framing.
- **Today's focus**: a short ranked list (rarely more than 3–5 rows) of `Task` cards, each showing title, course chip, estimate, and a one-line reason collapsed by default (`due in 3 days · 4.5h left`) that expands to the full weighted-contribution explanation on tap, the same explanation pattern as the task block's planner-reason disclosure, reused here rather than invented twice.
- **Upcoming strip**: a compact horizontal list of the next few deadlines (assessment title, course colour dot, days-remaining in mono), not a calendar widget; this is a glance, the semester map is where you go to inspect it.
- **Workload verdict**: one line, one of the four week-state treatments defined in **Week-state system**, below (`Workload: Comfortable · 3.5 focused hours planned`). This is the same visual language as the workload strip on the semester map, not a separate badge style.

Today never invents impossible content: if the planner has nothing ranked (rest day, everything pinned/done), the focus list collapses to a single calm line, "Nothing urgent: next planned work is tomorrow", rather than padding with low-value suggestions.

## Calendar view

The semester map is term-long and deliberately coarse; Calendar is where a student actually looks at a day or week and moves things. Two different zoom levels, two different jobs; don't try to make one view do both.

- **Week view** (default on desktop): a 7-column grid, hour rows on the left in mono, `CalendarBlock`s rendered as filled rectangles inside their time slot: lecture/commitment blocks in flat `--ink`-bordered white, planned-study blocks in the owning course's colour at reduced opacity with a solid `--cobalt` outline when `accepted`/pinned, and a lighter dashed outline while still `suggested`.
- **Day view** (default on mobile, reachable from week view by tapping a day): same block language, single column, larger touch targets.
- **Per-day capacity readout** directly under the day header, mono, small, matching the plan's own example format (`Lectures 4h · Available 5h · Planned 2h45m`); this is the capacity engine's output made visible, not a decorative summary.
- **Dragging a block** must show the consequence before it commits, matching the Task block interaction rule already specified: a small inline preview (`Moves 90 min into Thursday, still Comfortable`) appears under the cursor/finger during the drag, not just on drop.
- **Pinned and manually-moved blocks** get a small solid-fill treatment (no dashed outline) so a glance at the week distinguishes "the plan suggested this" from "you committed to this"; this distinction is load-bearing for trust, not a nice-to-have.

## Focus session

Focus is the execution counterpart to the semester map. On mobile it can take the full screen; on desktop it can live in a focused panel or compact companion view.

- A large circular progress indicator shows time remaining and elapsed time in text.
- Current task shows course, topic/assessment context, and a plain-language objective.
- A short session plan supports checkable steps; steps are optional and can be skipped without guilt.
- A notes area captures friction, misconceptions, or follow-up work.
- End-of-session capture asks for actual minutes and a simple outcome; it can update future estimates.

The circular timer should not be the only way to understand progress. Screen readers and low-motion users must receive the same time state in text.

## Grade tracker

Lives inside a course workspace's Grades tab. The failure mode to design against is false precision: a projected percentage that looks certain when half the grade is still unknown.

- **Current standing** is the one number rendered large (mono, page-title scale), always paired with its qualifier in small type directly beneath: `(of completed weight only)`. Never show a bare percentage without that qualifier; the plan is explicit that this ambiguity is a trust risk.
- **Best-case / expected / conservative** render as a compact three-column strip beneath, each labelled with its assumption in small mono type (`assumes 100%`, `assumes target`, `assumes your average · 4 samples`); the sample-size disclosure is not optional, it's what makes "conservative" honest.
- **Unknown/pending weight** gets its own visible chip, not a blank, e.g. a `--muted`-outlined pill reading `38% ungraded`. If pending weight is large enough that a projection would be misleading, replace the projection numbers with the plan's own line: *"Projected grade: unavailable, 55% of the grade has no expected score yet"* set in plain body type, `--muted`; this is normal, not an error state, so it should read as calm, not alarmed.
- **Needed average** renders as a single sentence, not a chart: `Need ~87% average across remaining work to reach 85%.`
- **GPA strip** sits at the Insights level (cross-course), not repeated per-course.

## Exam mode

A course's exam gets a dedicated, focused sub-view, reachable from the course workspace or from a deadline in Today/Semester when it's an exam.

- **Header**: exam title, days-remaining in large mono, matching the semester map's date precision.
- **Coverage checklist**: one row per topic, using the same confidence vocabulary as elsewhere (Not started/Learning/Comfortable/Confident) rendered as a small filled-proportion bar per row (not a percent-only number) plus the label in text; never colour-only.
- **Readiness** is the one large number on the screen, always shown with its constituent weighting available on tap/expand (which topics are dragging it down); same "never an unexplained number" rule as `priority_score`.
- **Suggested pace** renders as a plain sentence under readiness, matching the plan's own copy style (`1 hour/day + 2-hour weekend review`); no separate chart for a single number.

## Materials and revision

Lives inside a course workspace's Materials and Revision tabs.

- **Materials list**: a plain filterable list (course/week/topic/assessment tag chips, mono), not a card grid; this content is reference material, not decoration. Each row shows type icon (slide/PDF/reading/recording/link), title, and tags.
- **Topic confidence** uses the same four-state vocabulary and bar-plus-label treatment as Exam mode's coverage checklist: one visual system for "how well do I know this," reused everywhere it appears, not reinvented per screen.
- **Revision queue** is a short list, same visual language as Today's focus list (it's the same underlying `Task` object, spaced-repetition-generated); explicitly not a second competing list style. A daily cap indicator (`3 of 3 reviews today`) sits at the top so the queue never reads as infinite.

## AI assistant and command interface

AI-touched content needs to be visually distinct from human-authored content at a glance, everywhere it appears; this is a guardrail from the plan (disclosure, editability, source attribution), not a style preference.

- **AI-generated content marker**: a small `--muted`-outlined mono tag, top-left corner of the content block, with three honest states rather than one permanent stamp:
  - `AI DRAFT`: untouched since generation.
  - `AI-ASSISTED`: the student has made light edits.
  - `EDITED BY YOU`: the student has substantially rewritten the content; the AI origin is no longer the accurate description of what's on the page.
  Transition between states by edit volume (e.g. a rough diff-percentage threshold, tuned later), not a manual toggle; provenance should track what actually happened to the content, not become either a permanent stigma or a self-reported claim.
- **Source attribution**: a collapsed strip beneath AI content listing which materials were used (`Sourced: Week 7 slides, Lecture 12 notes`), expandable, never hidden behind a second click for the first disclosure line.
- **Chat surface** (course/assessment-scoped): plain conversational list, `--paper` background, no bubbles-with-shadows; align with the notebook register, not a generic chat-app skin.
- **Stage C confirm-before-write preview**: any command-interface mutation renders as a small inline card *before* committing: plain-language summary of the parsed intent, the concrete effect (`frees 1h 30m today`), and two actions (`Confirm` / `Cancel`), visually similar to the Calendar view's drag-preview card, since both are "show the consequence before it happens" moments and should look like the same pattern, not two.

## Weekly review

A short, low-friction full-screen flow (not a modal you can accidentally dismiss), reachable from Today or a scheduled nudge.

- **Planned vs completed**: two large mono numbers side by side, plain, no gauge or donut; this is a fact, not a score.
- **Cause selection**: a short list of tappable chips (`Underestimated`, `More lectures than expected`, `Personal commitments`, `Procrastinated`, `Other`); single or multi-select, never a required free-text field as the only option.
- **Next week risk**: reuses the risk-callout component (oxide hatch + icon + text) from the semester map, one row per reason; same component, not a new one, since it's the same underlying signal.
- Ends with a primary action, `Replan next week`, and an equally reachable secondary action, `Review later`, not hidden or demoted, just distinct. Choosing `Review later` doesn't pretend the old plan is current: the workload verdict and any affected week states keep showing their real (possibly stale) state with a small `not yet reviewed` marker until the student comes back, rather than silently reverting to a calm-looking but outdated plan.

## Insights

Cross-course analytics, reachable from its own nav destination. Deliberately restrained: this is not a metrics dashboard for its own sake (the brand rule against "dashboard metrics with no decision attached" applies most here).

- **GPA strip** (see Grade tracker) at the top.
- **Estimation bias**, per task category, shown as a short sentence list, not a chart: `Coding tasks: ~35% longer than estimated (12 samples).` Categories below the minimum sample size don't render at all rather than showing a misleading small-sample number.
- **Unreviewed material** and **upcoming high-weight assessments**, pulled per-course, rendered as a short list linking back into the relevant course workspace; Insights surfaces, it doesn't duplicate detail views.

## Settings

Plain form-style screen, grouped into sections; no card-grid treatment, this is configuration, not content.

- **Notifications**: quiet hours (time-range picker), warning thresholds, delivery channel (email, v1), per-course toggles.
- **Planning**: max study hours/day, deep-work windows, safety-buffer percentage, grade-influence slider (`Low / Balanced / Strong / Off`) if that planner setting exists.
- **Academic**: grade scale (GPA mapping), timezone.
- **Data**: export, account deletion; plain, unambiguous, no dark patterns delaying the action.

## Components and interaction language

| Component | Behaviour |
| --- | --- |
| Sidebar | Clear active state with a pale rectangular highlight; no floating pill navigation. |
| Course lane | Opens a course detail view; provides a colour, code, and name together. |
| Assessment marker | Opens the assessment detail and its related tasks; uses a tooltip only as a supplement. |
| Task block | Shows title, estimate, due context, status, and planner reason on demand. Dragging must show the consequence before confirmation. |
| Capacity bar | Stacked by course, with labelled total hours and target range. Use patterns/labels in addition to colour. |
| Risk callout | Small oxide hatch, icon, and text. It explains the constraint and offers a path: replan, reduce estimate, or reschedule. |
| Group label chip | Plain `--muted`-outlined text pill on an assessment (e.g. `with Alex, Priya`); a label, not an avatar or account reference, since group members are text-only. |
| AI provenance tag | `--muted`-outlined mono tag, top-left of any AI-authored content block. Three states (`AI DRAFT` / `AI-ASSISTED` / `EDITED BY YOU`) tracking edit volume, not a permanent stamp. |
| Field-note annotation | Decorative or supplemental only. It must never contain information required to act. |

Use crisp 1 px rules, small square-ish controls, and modest 6–10 px radii. Hover and selected states can use a pale paper tint; do not rely on heavy shadows.

## Mobile behaviour

Mobile should be a purpose-built companion, not a shrunken desktop canvas.

- Replace the sidebar with the five-slot bottom navigation defined in **Primary navigation**: Today, Calendar, Focus, Courses, More.
- Let the semester map become vertically stacked course strips with horizontal week scrolling, or offer a week-by-week workload view when space is tight.
- Keep task capture, next action, and focus session one tap away.
- Preserve a minimum 44 × 44 px target for interactive elements.
- Keep important state above the fold: current focus, next deadline, risk summary, and the primary action.

## Motion

Motion should help a student understand cause and effect, especially after a replan.

- Use 160–200 ms opacity and position transitions for ordinary navigation.
- When a planner run changes blocks, show a before/after diff or “moved from Tue to Thu” summary before committing it.
- Do not animate lines sliding across the map without explanation; the plan may feel untrustworthy.
- Honour `prefers-reduced-motion` by replacing movement with instant state changes and textual summaries.

## Accessibility and data clarity

- Meet WCAG AA contrast for text and interactive controls.
- Never communicate course, urgency, or completion by colour alone.
- Give maps and charts a concise text summary plus keyboard-accessible data points or a tabular alternative.
- Keep keyboard focus clearly visible on the dark rail and the paper sheet.
- Pair icons with visible labels in primary navigation.
- Use real text for dates, durations, and scores; do not bake essential information into a chart or an image.

## Empty and difficult states

Semestra earns trust in imperfect semesters.

- **No courses yet:** invite the student to add a course, then show a tiny example map as an illustration, not prefilled fake work.
- **No tasks in a course:** explain that assessments and topics can be converted into tasks when work is known.
- **No viable plan:** state the constraint plainly, such as “18 hours do not fit before Friday with your 12-hour limit,” then show choices.
- **Incomplete grade information:** distinguish “unknown” from zero and do not imply a calculated final grade is certain.
- **Missed session:** retain history without shame; offer to re-estimate or replan.

## Implementation starter

```css
:root {
  --canvas: #efede7;
  --paper: #f8f7f3;
  --ink: #222933;
  --muted: #68707b;
  --rule: #cdd0cf;
  --sidebar: #20262e;
  --cobalt: #2857a0;
  --oxide: #ae4d40;
  --sage: #64816c;
  --ochre: #b68a2c;
}
```

Prefer CSS/SVG for the rules, hatching, timeline, and charts. A very subtle paper grain can be added as a low-contrast CSS noise layer, but it should disappear behind content and be removable for accessibility. The visual reference is direction, not a production image asset.

## Design review checklist

Before shipping a screen, check:

1. Does it help the student make one better decision, not merely show more data?
2. Is a Task still the only object the planner actually schedules?
3. Can course identity, status, and risk be understood without colour?
4. Does the screen still feel composed when a semester has five courses and dozens of tasks?
5. Is any handwritten treatment decorative rather than essential?
6. Would the layout remain calm during a genuinely overloaded week?
7. Does this screen belong to one of the eight primary destinations, and does it reuse an existing component/pattern rather than inventing a new visual language for something already solved elsewhere (risk callout, confidence bar, planner-reason disclosure, AI provenance tag)?

## Reference

This system is based on the approved **Field Notes** concept exploration: a ledger-paper semester map paired with a focused mobile study session. Keep the visual vocabulary (paper, charcoal rail, measured grid, restrained course pigments, and small human annotations) while implementing the product with real, accessible interface elements.
