"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { apiFetch, ApiError } from "@/lib/api";
import type {
  Assessment,
  CalendarBlock,
  Course,
  DayCapacity,
  GradeItem,
  Semester,
  Task,
} from "@/lib/types";
import { WEEK_STATE_LABEL, weekState, type WeekState } from "@/components/WeekState";
import { AssessmentMarker, CourseLaneLine, RiskWindow } from "@/components/SemesterMapIcons";
import { pickCurrentSemester } from "@/lib/semester";
import { formatMinutes } from "@/lib/format";

// Semester setup + map — see "Primary navigation" (Semester row: "the
// term-long course-lane view") and "Semester map rules" in
// mdfile/DESIGN.md. Visual language (lanes, markers, at-risk hatch,
// workload stack) follows semester/asset/SEMESTER_MAP_SVG_KIT.md.
export default function SemesterPage() {
  const [semesters, setSemesters] = useState<Semester[] | null>(null);
  const [showTermsForm, setShowTermsForm] = useState(false);

  useEffect(() => {
    apiFetch<Semester[]>("/api/semesters").then(setSemesters);
  }, []);

  const current = semesters ? pickCurrentSemester(semesters) : null;

  return (
    <main className="min-h-dvh w-full bg-[var(--fn-paper)] px-8 py-10 md:px-12">
      <div className="flex items-baseline justify-between">
        <div>
          <p className="fn-eyebrow">Semester</p>
          <h1 className="mt-1 text-2xl font-semibold">{current?.name ?? "Terms"}</h1>
        </div>
        <button
          type="button"
          onClick={() => setShowTermsForm((value) => !value)}
          className="fn-mono text-xs text-[var(--fn-cobalt)] underline underline-offset-2"
        >
          {showTermsForm ? "Hide" : "Manage term"}
        </button>
      </div>

      {current && <SemesterMap semester={current} />}

      {showTermsForm && semesters && (
        <div className="mt-10 border-t border-[var(--fn-rule)] pt-6">
          <TermsManager semesters={semesters} onChange={setSemesters} />
        </div>
      )}
    </main>
  );
}

interface TermFormValues {
  name: string;
  start_date: string;
  end_date: string;
}

const EMPTY_FORM: TermFormValues = { name: "", start_date: "", end_date: "" };

function TermsManager({
  semesters,
  onChange,
}: {
  semesters: Semester[];
  onChange: (semesters: Semester[]) => void;
}) {
  const [editingId, setEditingId] = useState<number | "new" | null>(null);
  const [form, setForm] = useState<TermFormValues>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function startCreate() {
    setEditingId("new");
    setForm(EMPTY_FORM);
    setError(null);
  }

  function startEdit(semester: Semester) {
    setEditingId(semester.id);
    setForm({
      name: semester.name,
      start_date: semester.start_date.slice(0, 10),
      end_date: semester.end_date.slice(0, 10),
    });
    setError(null);
  }

  function cancel() {
    setEditingId(null);
    setError(null);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (editingId === "new") {
        const created = await apiFetch<Semester>("/api/semesters", {
          method: "POST",
          body: JSON.stringify(form),
        });
        onChange([...semesters, created]);
      } else {
        const updated = await apiFetch<Semester>(`/api/semesters/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(form),
        });
        onChange(semesters.map((s) => (s.id === editingId ? updated : s)));
      }
      setEditingId(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(semester: Semester) {
    if (!window.confirm(`Delete ${semester.name}? This can't be undone.`)) return;
    await apiFetch(`/api/semesters/${semester.id}`, { method: "DELETE" });
    onChange(semesters.filter((s) => s.id !== semester.id));
  }

  return (
    <>
      <ul className="mt-4 flex flex-col divide-y divide-[var(--fn-rule)]">
        {semesters.map((semester) =>
          editingId === semester.id ? (
            <li key={semester.id} className="py-3">
              <TermForm
                form={form}
                setForm={setForm}
                error={error}
                submitting={submitting}
                onSubmit={handleSubmit}
                onCancel={cancel}
                submitLabel="Save"
              />
            </li>
          ) : (
            <li key={semester.id} className="flex items-baseline justify-between gap-3 py-2.5 text-sm">
              <span className="font-medium">{semester.name}</span>
              <span className="fn-mono flex-1 text-[var(--fn-muted)]">
                {semester.start_date.slice(0, 10)} – {semester.end_date.slice(0, 10)}
              </span>
              <button
                type="button"
                onClick={() => startEdit(semester)}
                className="text-[var(--fn-cobalt)] underline underline-offset-2"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => handleDelete(semester)}
                className="text-[var(--fn-oxide)] underline underline-offset-2"
              >
                Delete
              </button>
            </li>
          ),
        )}
        {semesters.length === 0 && editingId !== "new" && (
          <li className="py-2.5 text-sm text-[var(--fn-muted)]">No semesters yet — add one below.</li>
        )}
      </ul>

      {editingId === "new" ? (
        <div className="mt-6">
          <TermForm
            form={form}
            setForm={setForm}
            error={error}
            submitting={submitting}
            onSubmit={handleSubmit}
            onCancel={cancel}
            submitLabel="Add semester"
          />
        </div>
      ) : (
        <button type="button" onClick={startCreate} className="fn-btn-primary !w-fit mt-6 px-4">
          Add semester
        </button>
      )}
    </>
  );
}

function TermForm({
  form,
  setForm,
  error,
  submitting,
  onSubmit,
  onCancel,
  submitLabel,
}: {
  form: TermFormValues;
  setForm: (form: TermFormValues) => void;
  error: string | null;
  submitting: boolean;
  onSubmit: (event: FormEvent) => void;
  onCancel: () => void;
  submitLabel: string;
}) {
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="fn-label">Name</span>
        <input
          value={form.name}
          onChange={(event) => setForm({ ...form, name: event.target.value })}
          required
          className="fn-input"
          placeholder="Fall 2026"
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="fn-label">Start date</span>
        <input
          type="date"
          value={form.start_date}
          onChange={(event) => setForm({ ...form, start_date: event.target.value })}
          required
          className="fn-input"
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="fn-label">End date</span>
        <input
          type="date"
          value={form.end_date}
          onChange={(event) => setForm({ ...form, end_date: event.target.value })}
          required
          className="fn-input"
        />
      </label>

      {error && (
        <p role="alert" className="text-sm text-[var(--fn-oxide)]">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <button type="submit" disabled={submitting} className="fn-btn-primary !w-fit px-4">
          {submitting ? "Saving…" : submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-[var(--fn-rule)] px-4 text-sm hover:bg-[var(--fn-canvas)]"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

interface Week {
  start: Date;
  label: string;
  monthLabel: string;
  plannedMinutes: number;
  capacityMinutes: number;
  plannedByCourse: Map<number | null, number>;
}

function buildWeeks(
  startDate: string,
  endDate: string,
  days: DayCapacity[],
  blocks: CalendarBlock[],
  courseIdByTaskId: Map<number, number>,
): Week[] {
  const capacityByDate = new Map(days.map((d) => [d.date, d.recommended_study_minutes]));
  const plannedByDate = new Map<string, number>();
  const plannedByDateCourse = new Map<string, Map<number | null, number>>();

  for (const block of blocks) {
    if (block.status === "skipped") continue;
    const date = block.start_at.slice(0, 10);
    const minutes = (new Date(block.end_at).getTime() - new Date(block.start_at).getTime()) / 60_000;
    plannedByDate.set(date, (plannedByDate.get(date) ?? 0) + minutes);

    const courseId = block.task_id ? (courseIdByTaskId.get(block.task_id) ?? null) : null;
    const byCourse = plannedByDateCourse.get(date) ?? new Map<number | null, number>();
    byCourse.set(courseId, (byCourse.get(courseId) ?? 0) + minutes);
    plannedByDateCourse.set(date, byCourse);
  }

  const weeks: Week[] = [];
  const cursor = new Date(`${startDate.slice(0, 10)}T00:00:00`);
  const end = new Date(`${endDate.slice(0, 10)}T00:00:00`);
  let weekNumber = 1;

  while (cursor <= end) {
    const weekStart = new Date(cursor);
    let plannedMinutes = 0;
    let capacityMinutes = 0;
    const plannedByCourse = new Map<number | null, number>();

    for (let i = 0; i < 7 && cursor <= end; i++) {
      const dateString = cursor.toISOString().slice(0, 10);
      capacityMinutes += capacityByDate.get(dateString) ?? 0;
      plannedMinutes += plannedByDate.get(dateString) ?? 0;
      const dayByCourse = plannedByDateCourse.get(dateString);
      if (dayByCourse) {
        for (const [courseId, minutes] of dayByCourse) {
          plannedByCourse.set(courseId, (plannedByCourse.get(courseId) ?? 0) + minutes);
        }
      }
      cursor.setDate(cursor.getDate() + 1);
    }

    weeks.push({
      start: weekStart,
      label: `W${weekNumber}`,
      monthLabel: weekStart.toLocaleDateString(undefined, { month: "short" }).toUpperCase(),
      plannedMinutes,
      capacityMinutes,
      plannedByCourse,
    });
    weekNumber++;
  }

  return weeks;
}

function percentBetween(date: string, start: string, end: string): number {
  const total = new Date(end).getTime() - new Date(start).getTime();
  const offset = new Date(date).getTime() - new Date(start).getTime();
  if (total <= 0) return 0;
  return Math.min(100, Math.max(0, (offset / total) * 100));
}

/** The week whose 7-day span contains `date`, for looking up that week's at-risk state. */
function weekContaining(date: string, weeks: Week[]): Week | undefined {
  const target = new Date(`${date.slice(0, 10)}T00:00:00`).getTime();
  for (let i = 0; i < weeks.length; i++) {
    const weekStart = weeks[i].start.getTime();
    const weekEnd = i + 1 < weeks.length ? weeks[i + 1].start.getTime() : Infinity;
    if (target >= weekStart && target < weekEnd) return weeks[i];
  }
  return undefined;
}

/** Month-group spans for the axis header — consecutive weeks sharing a month, collapsed into one label. */
function monthGroups(weeks: Week[]): { label: string; span: number }[] {
  const groups: { label: string; span: number }[] = [];
  for (const week of weeks) {
    const last = groups[groups.length - 1];
    if (last && last.label === week.monthLabel) {
      last.span += 1;
    } else {
      groups.push({ label: week.monthLabel, span: 1 });
    }
  }
  return groups;
}

const OTHER_COLOUR = "#68707B"; // var(--fn-muted) — lecture/commitment minutes not tied to a course

/** Per-course breakdown behind a week's workload bar, for the hover popover. */
function weekBreakdown(week: Week, courses: Course[]): { name: string; minutes: number; colour: string }[] {
  return [...week.plannedByCourse.entries()]
    .filter(([, minutes]) => minutes > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([courseId, minutes]) => {
      const course = courseId ? courses.find((c) => c.id === courseId) : undefined;
      return { name: course?.title ?? "Other", minutes, colour: course?.colour ?? OTHER_COLOUR };
    });
}

function WeekTooltipContent({ week, state, courses }: { week: Week; state: WeekState; courses: Course[] }) {
  const dateLabel = week.start.toLocaleDateString(undefined, { day: "numeric", month: "short" });
  const breakdown = weekBreakdown(week, courses);

  return (
    <>
      <p className="fn-mono text-[11px] font-semibold">
        {week.label} — week of {dateLabel}
      </p>
      <p className="fn-mono mt-1 text-[11px] text-[#c9cdd3]">
        {WEEK_STATE_LABEL[state]} — {formatMinutes(week.plannedMinutes)} planned /{" "}
        {formatMinutes(week.capacityMinutes)} capacity
      </p>
      {breakdown.length > 0 && (
        <ul className="mt-2 flex flex-col gap-0.5 border-t border-white/10 pt-2">
          {breakdown.map((item) => (
            <li key={item.name} className="fn-mono flex items-center gap-1.5 text-[11px] text-[#c9cdd3]">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: item.colour }} />
              <span className="min-w-0 flex-1 truncate">{item.name}</span>
              <span>{formatMinutes(item.minutes)}</span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

const TOOLTIP_WIDTH = 224; // px — matches the w-56 tooltip below

// Portal + fixed-position, not CSS group-hover — the chart's own
// container is a fixed-height overflow-x-auto box, which would clip an
// absolutely-positioned popover before it ever became visible (the same
// class of bug the notification bell hit, see AppShell.tsx).
function WeekBar({
  week,
  state,
  courses,
  children,
}: {
  week: Week;
  state: WeekState;
  courses: Course[];
  children: ReactNode;
}) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  function show() {
    const rect = anchorRef.current?.getBoundingClientRect();
    if (!rect) return;
    const half = TOOLTIP_WIDTH / 2;
    const left = Math.min(Math.max(rect.left + rect.width / 2, half + 8), window.innerWidth - half - 8);
    setPosition({ top: rect.top - 8, left });
  }

  return (
    <div
      ref={anchorRef}
      className="flex w-10 shrink-0 flex-col items-center gap-1"
      onMouseEnter={show}
      onMouseLeave={() => setPosition(null)}
    >
      {children}
      {position &&
        createPortal(
          <div
            style={{ top: position.top, left: position.left }}
            className="pointer-events-none fixed z-30 w-56 -translate-x-1/2 -translate-y-full rounded-md border border-[var(--fn-rule)] bg-[var(--fn-sidebar)] p-3 text-left text-[#e7e9ec] shadow-lg"
          >
            <WeekTooltipContent week={week} state={state} courses={courses} />
          </div>,
          document.body,
        )}
    </div>
  );
}

function SemesterMap({ semester }: { semester: Semester }) {
  const [courses, setCourses] = useState<Course[] | null>(null);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [gradeItems, setGradeItems] = useState<GradeItem[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [days, setDays] = useState<DayCapacity[]>([]);
  const [blocks, setBlocks] = useState<CalendarBlock[]>([]);

  useEffect(() => {
    Promise.all([
      apiFetch<Course[]>("/api/courses"),
      apiFetch<Assessment[]>("/api/assessments"),
      apiFetch<GradeItem[]>("/api/grade-items"),
      apiFetch<Task[]>("/api/tasks"),
      apiFetch<DayCapacity[]>(
        `/api/calendar/capacity?from=${semester.start_date}&to=${semester.end_date}`,
      ),
      apiFetch<CalendarBlock[]>("/api/calendar-blocks"),
    ]).then(([allCourses, allAssessments, allGradeItems, allTasks, capacityDays, allBlocks]) => {
      setCourses(allCourses.filter((c) => c.semester_id === semester.id));
      setAssessments(allAssessments);
      setGradeItems(allGradeItems);
      setTasks(allTasks);
      setDays(capacityDays);
      setBlocks(allBlocks);
    });
  }, [semester.id, semester.start_date, semester.end_date]);

  if (!courses) return null;

  const courseIdByTaskId = new Map(tasks.map((t) => [t.id, t.course_id]));
  const weeks = buildWeeks(semester.start_date, semester.end_date, days, blocks, courseIdByTaskId);
  const groups = monthGroups(weeks);
  const weighingByGradeItemId = new Map(gradeItems.map((item) => [item.id, item.weighting]));
  const todayPercent = percentBetween(new Date().toISOString(), semester.start_date, semester.end_date);

  const maxWeekHours = Math.max(1, ...weeks.map((w) => Math.max(w.plannedMinutes, w.capacityMinutes) / 60));
  const worstWeek = weeks.reduce<Week | null>((worst, week) => {
    if (week.capacityMinutes <= 0) return worst;
    const over = week.plannedMinutes - week.capacityMinutes;
    const worstOver = worst ? worst.plannedMinutes - worst.capacityMinutes : -Infinity;
    return over > worstOver ? week : worst;
  }, null);

  return (
    <div className="mt-6">
      <p className="fn-eyebrow">Semester map</p>

      <div className="mt-3">
      {/* Week axis — see week-axis.svg for the reference layout */}
      <div className="fn-mono min-w-full overflow-x-auto text-[13px]">
        <div
          className="grid border-b border-[var(--fn-rule)]"
          style={{ gridTemplateColumns: `repeat(${Math.max(weeks.length, 1)}, minmax(2.5rem, 1fr))` }}
        >
          {weeks.map((week) => (
            <div
              key={week.label}
              className="border-r border-[var(--fn-rule)] px-1 py-1.5 text-center text-[var(--fn-ink)] last:border-r-0"
            >
              {week.label}
            </div>
          ))}
        </div>
        <div
          className="grid border-b border-[var(--fn-rule)] pt-1 pb-1.5 text-[11px] tracking-wider text-[var(--fn-muted)]"
          style={{ gridTemplateColumns: `repeat(${Math.max(groups.length, 1)}, 1fr)` }}
        >
          {groups.map((group, index) => (
            <div key={`${group.label}-${index}`} className="text-center" style={{ gridColumn: `span ${group.span}` }}>
              {group.label}
            </div>
          ))}
        </div>
      </div>

      {/* Course lanes */}
      <div className="mt-6 flex flex-col gap-6">
        {courses.map((course) => (
          <div key={course.id} className="flex items-center gap-4">
            <div className="w-40 shrink-0 truncate text-sm">
              <span className="fn-mono font-semibold" style={{ color: course.colour }}>
                {course.code ?? course.title.slice(0, 6).toUpperCase()}
              </span>{" "}
              <span className="text-[var(--fn-ink)]">{course.title}</span>
            </div>
            <div className="relative flex-1 py-4">
              <CourseLaneLine color={course.colour} splitPercent={todayPercent} />
              {assessments
                .filter((a) => a.course_id === course.id)
                .map((assessment) => {
                  const week = weekContaining(assessment.due_at, weeks);
                  const state: WeekState = week ? weekState(week.plannedMinutes, week.capacityMinutes) : "comfortable";
                  const atRisk = state === "at_risk" || state === "critical";
                  const weighting = assessment.grade_item_id
                    ? weighingByGradeItemId.get(assessment.grade_item_id)
                    : undefined;
                  const left = percentBetween(assessment.due_at, semester.start_date, semester.end_date);
                  return (
                    <div
                      key={assessment.id}
                      className="absolute top-1/2 flex -translate-y-1/2 flex-col items-center"
                      style={{ left: `${left}%`, transform: "translate(-50%, -50%)", color: course.colour }}
                      title={`${assessment.title} — due ${new Date(assessment.due_at).toLocaleDateString()}`}
                    >
                      {atRisk ? (
                        <RiskWindow className="h-4 w-10" />
                      ) : (
                        <AssessmentMarker className="h-4 w-4" />
                      )}
                      <span className="fn-mono absolute top-full mt-1 w-max max-w-32 truncate text-center text-[11px] text-[var(--fn-ink)]">
                        {assessment.title}
                        {weighting ? ` · ${weighting}%` : ""}
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>
        ))}
        {courses.length === 0 && (
          <p className="text-sm text-[var(--fn-muted)]">No courses in this semester yet.</p>
        )}
      </div>

      {/* Legend — mirrors legend.svg, rebuilt inline so it can't drift from the lanes above */}
      <div className="fn-mono mt-10 flex flex-wrap items-center gap-x-8 gap-y-2 border-t border-[var(--fn-rule)] pt-4 text-xs tracking-wide text-[var(--fn-ink)]">
        <span className="flex items-center gap-2">
          <span className="h-[2px] w-8 bg-[var(--fn-muted)]" /> COURSE LANE
        </span>
        <span className="flex items-center gap-2">
          <AssessmentMarker className="h-3.5 w-3.5 text-[var(--fn-muted)]" /> ASSESSMENT
        </span>
        <span className="flex items-center gap-2">
          <RiskWindow className="h-3.5 w-8 text-[var(--fn-oxide)]" /> AT RISK
        </span>
        <span className="flex items-center gap-2">
          <span className="h-0 w-8 border-t-2 border-dashed border-[var(--fn-muted)]" /> PROJECTED
        </span>
      </div>

      {/* Weekly workload */}
      <p className="fn-eyebrow mt-10">Weekly workload (hours)</p>
      <div className="mt-3 flex items-end gap-2 overflow-x-auto pb-2" style={{ height: "9rem" }}>
        {weeks.map((week) => {
          const state = weekState(week.plannedMinutes, week.capacityMinutes);
          const isHighLoad = state === "at_risk" || state === "critical";
          const segments = [...week.plannedByCourse.entries()].sort((a, b) => (a[0] ?? -1) - (b[0] ?? -1));
          return (
            <WeekBar key={week.label} week={week} state={state} courses={courses}>
              <div
                className="relative flex w-full flex-1 flex-col-reverse overflow-hidden rounded-t"
                style={{ minHeight: "1px" }}
              >
                {segments.map(([courseId, minutes]) => {
                  const colour = courseId ? (courses.find((c) => c.id === courseId)?.colour ?? OTHER_COLOUR) : OTHER_COLOUR;
                  const heightPercent = (minutes / 60 / maxWeekHours) * 100;
                  return (
                    <div
                      key={courseId ?? "other"}
                      style={{ height: `${heightPercent}%`, backgroundColor: colour }}
                    />
                  );
                })}
                {isHighLoad && <div className="absolute inset-x-0 top-0 h-2 bg-[var(--fn-oxide)]" />}
              </div>
              <span className="fn-mono text-[10px] text-[var(--fn-ink)]">{week.label}</span>
            </WeekBar>
          );
        })}
        {weeks.length === 0 && <p className="text-sm text-[var(--fn-muted)]">No weeks in range.</p>}
      </div>

      {worstWeek && worstWeek.plannedMinutes > worstWeek.capacityMinutes && (
        <p className="mt-3 text-sm text-[var(--fn-muted)]">
          {worstWeek.label}: {formatMinutes(worstWeek.plannedMinutes)} planned,{" "}
          <span className="text-[var(--fn-oxide)]">
            {formatMinutes(worstWeek.plannedMinutes - worstWeek.capacityMinutes)} above target
          </span>
          .
        </p>
      )}
      </div>
    </div>
  );
}
