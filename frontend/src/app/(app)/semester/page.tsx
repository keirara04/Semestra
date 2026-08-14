"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { apiFetch, ApiError } from "@/lib/api";
import type {
  AcademicCalendarException,
  Assessment,
  CalendarBlock,
  Course,
  DayCapacity,
  GradeItem,
  Semester,
  Task,
} from "@/lib/types";
import { WEEK_STATE_LABEL, WeekStateDot, weekState, type WeekState } from "@/components/WeekState";
import { AssessmentMarker, CourseLaneLine, RiskWindow } from "@/components/SemesterMapIcons";
import { pickCurrentSemester } from "@/lib/semester";
import { formatMinutes } from "@/lib/format";

// Semester setup + map, see "Primary navigation" (Semester row: "the
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
          <li className="py-2.5 text-sm text-[var(--fn-muted)]">No semesters yet. Add one below.</li>
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

interface DayLoad {
  date: Date;
  plannedMinutes: number;
  capacityMinutes: number;
  plannedByCourse: Map<number | null, number>;
  isBreak: boolean;
}

interface Week {
  start: Date;
  label: string;
  monthLabel: string;
  plannedMinutes: number;
  capacityMinutes: number;
  plannedByCourse: Map<number | null, number>;
  days: DayLoad[];
}

function buildWeeks(
  startDate: string,
  endDate: string,
  days: DayCapacity[],
  blocks: CalendarBlock[],
  courseIdByTaskId: Map<number, number>,
): Week[] {
  const capacityByDate = new Map(days.map((d) => [d.date, d.recommended_study_minutes]));
  const isBreakByDate = new Map(days.map((d) => [d.date, d.is_break]));
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
    const weekDays: DayLoad[] = [];

    for (let i = 0; i < 7 && cursor <= end; i++) {
      const dateString = cursor.toISOString().slice(0, 10);
      const dayCapacity = capacityByDate.get(dateString) ?? 0;
      const dayPlanned = plannedByDate.get(dateString) ?? 0;
      const dayByCourse = plannedByDateCourse.get(dateString) ?? new Map<number | null, number>();
      capacityMinutes += dayCapacity;
      plannedMinutes += dayPlanned;
      for (const [courseId, minutes] of dayByCourse) {
        plannedByCourse.set(courseId, (plannedByCourse.get(courseId) ?? 0) + minutes);
      }
      weekDays.push({
        date: new Date(cursor),
        plannedMinutes: dayPlanned,
        capacityMinutes: dayCapacity,
        plannedByCourse: dayByCourse,
        isBreak: isBreakByDate.get(dateString) ?? false,
      });
      cursor.setDate(cursor.getDate() + 1);
    }

    weeks.push({
      start: weekStart,
      label: `W${weekNumber}`,
      monthLabel: weekStart.toLocaleDateString(undefined, { month: "short" }).toUpperCase(),
      plannedMinutes,
      capacityMinutes,
      plannedByCourse,
      days: weekDays,
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

interface MonthGroup {
  key: string;
  label: string;
  weeks: Week[];
}

/** Consecutive weeks sharing a month, collapsed into one selectable month tab. Week numbers inside stay absolute (a group's first week can be W5, W12, ...). */
function monthGroups(weeks: Week[]): MonthGroup[] {
  const groups: MonthGroup[] = [];
  for (const week of weeks) {
    const key = `${week.start.getFullYear()}-${week.start.getMonth()}`;
    const last = groups[groups.length - 1];
    if (last && last.key === key) {
      last.weeks.push(week);
    } else {
      groups.push({ key, label: week.monthLabel, weeks: [week] });
    }
  }
  return groups;
}

/** [start, end) ISO range spanning a month group's weeks. */
function monthGroupRange(group: MonthGroup): { start: string; end: string } {
  const start = group.weeks[0].start;
  const end = new Date(group.weeks[group.weeks.length - 1].start);
  end.setDate(end.getDate() + 7);
  return { start: start.toISOString(), end: end.toISOString() };
}

/** Day-of-month span for a week's axis column, clipped to the displayed range's end (a month's last week can be partial). */
function weekDayRangeLabel(week: Week, rangeEndIso: string): string {
  const start = week.start;
  const fullEnd = new Date(start);
  fullEnd.setDate(fullEnd.getDate() + 6);
  const rangeEnd = new Date(rangeEndIso);
  rangeEnd.setDate(rangeEnd.getDate() - 1);
  const end = fullEnd < rangeEnd ? fullEnd : rangeEnd;
  const sameMonth = start.getMonth() === end.getMonth();
  return sameMonth
    ? `${start.getDate()}–${end.getDate()}`
    : `${start.getDate()}–${end.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
}

/** One-letter weekday ticks for a week's axis column (M T W T F S S from wherever the week actually starts), clipped to the displayed range's end. */
function weekDayTicks(week: Week, rangeEndIso: string): { date: Date; letter: string }[] {
  const rangeEnd = new Date(rangeEndIso);
  const ticks: { date: Date; letter: string }[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(week.start);
    date.setDate(date.getDate() + i);
    if (date >= rangeEnd) break;
    ticks.push({ date, letter: date.toLocaleDateString(undefined, { weekday: "narrow" }) });
  }
  return ticks;
}

/** "Tue, Sep 8" — used in tooltips/titles wherever a specific date needs its weekday spelled out. */
function weekdayDateLabel(dateIso: string): string {
  return new Date(dateIso).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

const OTHER_COLOUR = "#68707B"; // var(--fn-muted), lecture/commitment minutes not tied to a course

/** Per-course breakdown behind a workload bar (week- or day-level), for the hover popover. */
function courseBreakdown(
  plannedByCourse: Map<number | null, number>,
  courses: Course[],
): { name: string; minutes: number; colour: string }[] {
  return [...plannedByCourse.entries()]
    .filter(([, minutes]) => minutes > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([courseId, minutes]) => {
      const course = courseId ? courses.find((c) => c.id === courseId) : undefined;
      return { name: course?.title ?? "Other", minutes, colour: course?.colour ?? OTHER_COLOUR };
    });
}

function WorkloadTooltipContent({
  title,
  state,
  plannedMinutes,
  capacityMinutes,
  plannedByCourse,
  courses,
}: {
  title: string;
  state: WeekState;
  plannedMinutes: number;
  capacityMinutes: number;
  plannedByCourse: Map<number | null, number>;
  courses: Course[];
}) {
  const breakdown = courseBreakdown(plannedByCourse, courses);

  return (
    <>
      <p className="fn-mono text-[11px] font-semibold">{title}</p>
      <p className="fn-mono mt-1 text-[11px] text-[#c9cdd3]">
        {WEEK_STATE_LABEL[state]}: {formatMinutes(plannedMinutes)} planned / {formatMinutes(capacityMinutes)} capacity
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

const TOOLTIP_WIDTH = 224; // px, matches the w-56 tooltip below

// Portal + fixed-position, not CSS group-hover: the chart's own
// container is a fixed-height overflow-x-auto box, which would clip an
// absolutely-positioned popover before it ever became visible (the same
// class of bug the notification bell hit, see AppShell.tsx).
function HoverBar({
  tooltip,
  children,
  style,
}: {
  tooltip: ReactNode;
  children: ReactNode;
  style?: React.CSSProperties;
}) {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  // Anchored to the pointer, not the hoverable box's own rect: this box
  // spans its full track height (so short/empty days are still easy to
  // hover), so a rect-based anchor would pin the tooltip to the top of
  // that whole track instead of near the bar the cursor is actually on.
  function trackPointer(event: React.MouseEvent<HTMLDivElement>) {
    const half = TOOLTIP_WIDTH / 2;
    const left = Math.min(Math.max(event.clientX, half + 8), window.innerWidth - half - 8);
    setPosition({ top: event.clientY - 12, left });
  }

  return (
    <div
      className="flex h-full w-full flex-1 flex-col items-center gap-1"
      style={style}
      onMouseEnter={trackPointer}
      onMouseMove={trackPointer}
      onMouseLeave={() => setPosition(null)}
    >
      {children}
      {position &&
        createPortal(
          <div
            style={{ top: position.top, left: position.left }}
            // Hardcoded hex, not var(--fn-rule)/var(--fn-sidebar): createPortal
            // renders this into document.body, outside the .fn-scoped
            // subtree those custom properties are defined on, so they'd
            // resolve to nothing there and the box would render transparent.
            className="pointer-events-none fixed z-30 w-56 -translate-x-1/2 -translate-y-full rounded-md border border-[#cdd0cf] bg-[#20262e] p-3 text-left text-[#e7e9ec] shadow-lg"
          >
            {tooltip}
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
  const [exceptions, setExceptions] = useState<AcademicCalendarException[]>([]);
  const [selectedMonthKey, setSelectedMonthKey] = useState<string | null>(null);
  const [isolatedCourseId, setIsolatedCourseId] = useState<number | null>(null);

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
      apiFetch<AcademicCalendarException[]>("/api/academic-calendar-exceptions"),
    ]).then(([allCourses, allAssessments, allGradeItems, allTasks, capacityDays, allBlocks, allExceptions]) => {
      setCourses(allCourses.filter((c) => c.semester_id === semester.id));
      setAssessments(allAssessments);
      setGradeItems(allGradeItems);
      setTasks(allTasks);
      setDays(capacityDays);
      setBlocks(allBlocks);
      setExceptions(allExceptions.filter((e) => e.semester_id === semester.id));
    });
  }, [semester.id, semester.start_date, semester.end_date]);

  if (!courses) return null;

  const courseIdByTaskId = new Map(tasks.map((t) => [t.id, t.course_id]));
  const weeks = buildWeeks(semester.start_date, semester.end_date, days, blocks, courseIdByTaskId);
  const groups = monthGroups(weeks);
  const weighingByGradeItemId = new Map(gradeItems.map((item) => [item.id, item.weighting]));
  const now = new Date().toISOString();
  const todayWeekGlobal = weekContaining(now, weeks);
  const defaultGroupIndex = Math.max(
    groups.findIndex((g) => g.weeks.includes(todayWeekGlobal as Week)),
    0,
  );
  const activeIndex = Math.max(
    selectedMonthKey ? groups.findIndex((g) => g.key === selectedMonthKey) : defaultGroupIndex,
    0,
  );
  const activeGroup: MonthGroup | undefined = groups[activeIndex];
  const displayedWeeks = activeGroup?.weeks ?? [];
  const { start: rangeStart, end: rangeEnd } = activeGroup
    ? monthGroupRange(activeGroup)
    : { start: semester.start_date, end: semester.end_date };
  const todayInRange = now >= rangeStart && now < rangeEnd;
  const todayPercent = todayInRange ? percentBetween(now, rangeStart, rangeEnd) : now < rangeStart ? 0 : 100;
  const todayWeek = todayInRange ? todayWeekGlobal : undefined;

  const displayedDays = displayedWeeks.flatMap((w) => w.days.filter((d) => d.date.toISOString() < rangeEnd));
  const maxDayHours = Math.max(1, ...displayedDays.map((d) => Math.max(d.plannedMinutes, d.capacityMinutes) / 60));
  const worstWeek = displayedWeeks.reduce<Week | null>((worst, week) => {
    if (week.capacityMinutes <= 0) return worst;
    const over = week.plannedMinutes - week.capacityMinutes;
    const worstOver = worst ? worst.plannedMinutes - worst.capacityMinutes : -Infinity;
    return over > worstOver ? week : worst;
  }, null);

  const columnTemplate = `repeat(${Math.max(displayedWeeks.length, 1)}, minmax(3.5rem, 1fr))`;

  // Not a stored field anywhere in the schema — "exam period" is inferred
  // from Assessment.type "exam" clustering, same signal a student would
  // use to eyeball it themselves. See "Semester map rules" in
  // mdfile/DESIGN.md: "Render a standard term as 14–16 weeks plus an exam period."
  const examWeeks = new Set(
    assessments
      .filter((a) => a.type === "exam")
      .map((a) => weekContaining(a.due_at, weeks))
      .filter((w): w is Week => w !== undefined),
  );
  const riskWeeksInView = displayedWeeks.filter((w) => {
    const s = weekState(w.plannedMinutes, w.capacityMinutes);
    return s === "at_risk" || s === "critical";
  });

  // AcademicCalendarException.end_date is inclusive (a break "through
  // Friday" includes Friday), unlike every other date range on this page
  // ([rangeStart, rangeEnd) half-open) — convert once here with +1 day so
  // downstream math (percentBetween) stays in the same convention as the
  // today-hairline and assessment markers it's drawn alongside.
  const breakBands = exceptions
    .map((exception) => {
      const startIso = `${exception.start_date.slice(0, 10)}T00:00:00`;
      const endExclusiveDate = new Date(`${exception.end_date.slice(0, 10)}T00:00:00`);
      endExclusiveDate.setDate(endExclusiveDate.getDate() + 1);
      const endIso = endExclusiveDate.toISOString();
      const clippedStart = startIso > rangeStart ? startIso : rangeStart;
      const clippedEnd = endIso < rangeEnd ? endIso : rangeEnd;
      if (clippedStart >= clippedEnd) return null;
      const left = percentBetween(clippedStart, rangeStart, rangeEnd);
      const right = percentBetween(clippedEnd, rangeStart, rangeEnd);
      return { label: exception.label, leftPercent: left, widthPercent: Math.max(right - left, 0.5) };
    })
    .filter((b): b is { label: string; leftPercent: number; widthPercent: number } => b !== null);

  // Term-at-a-glance strip: every other number on this page is scoped to
  // the active month tab, so this is the one place that answers "is the
  // WHOLE semester on pace," using the full `weeks`/`courses`/`assessments`
  // arrays rather than the month-scoped `displayedWeeks`.
  const totalCredits = courses.reduce((sum, c) => sum + (c.credits ?? 0), 0);
  const hasCreditData = courses.some((c) => c.credits !== null);
  // assessments/gradeItems/tasks are fetched unfiltered by semester (unlike
  // courses, which is filtered at fetch time above) — apply the semester
  // filter here via courseIds, or this silently counts every semester's
  // assessments.
  const courseIds = new Set(courses.map((c) => c.id));
  const assessmentsRemaining = assessments.filter((a) => courseIds.has(a.course_id) && a.status !== "done").length;
  const weeksWithCapacity = weeks.filter((w) => w.capacityMinutes > 0);
  const termAverageRatio = weeksWithCapacity.length
    ? weeksWithCapacity.reduce((sum, w) => sum + w.plannedMinutes / w.capacityMinutes, 0) / weeksWithCapacity.length
    : null;
  const termAverageMinutes = weeksWithCapacity.length
    ? { planned: weeksWithCapacity.reduce((s, w) => s + w.plannedMinutes, 0) / weeksWithCapacity.length, capacity: weeksWithCapacity.reduce((s, w) => s + w.capacityMinutes, 0) / weeksWithCapacity.length }
    : null;
  const termAverageState: WeekState | null = termAverageMinutes
    ? weekState(termAverageMinutes.planned, termAverageMinutes.capacity)
    : null;

  return (
    <div className="mt-6">
      <div className="flex items-baseline justify-between">
        <p className="fn-eyebrow">Semester map</p>
        {activeGroup && <p className="fn-mono text-xs text-[var(--fn-muted)]">{semester.name}</p>}
      </div>

      {/* Month picker: one selectable month at a time, week numbers underneath stay absolute (a group's first week can read W5 or W12). */}
      <div className="fn-mono mt-3 flex flex-wrap gap-1 text-xs tracking-wide">
        {groups.map((group, index) => {
          const isActive = index === activeIndex;
          const hasRisk = group.weeks.some(
            (w) => weekState(w.plannedMinutes, w.capacityMinutes) === "at_risk" || weekState(w.plannedMinutes, w.capacityMinutes) === "critical",
          );
          return (
            <button
              key={group.key}
              type="button"
              aria-current={isActive || undefined}
              onClick={() => setSelectedMonthKey(group.key)}
              className={`relative rounded px-2.5 py-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--fn-cobalt)] ${
                isActive
                  ? "bg-[var(--fn-ink)] text-[var(--fn-paper)]"
                  : "text-[var(--fn-muted)] hover:bg-[var(--fn-rule)]/40 hover:text-[var(--fn-ink)]"
              }`}
            >
              {group.label}
              {hasRisk && (
                <span
                  className={`absolute top-1 right-1 h-1 w-1 rounded-full ${isActive ? "bg-[var(--fn-oxide)]" : "bg-[var(--fn-oxide)]"}`}
                  aria-hidden="true"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Risk callout: explains the constraint and offers a path, see "Risk callout" in mdfile/DESIGN.md. No replan/reschedule backend action exists yet, so the path is a link into Calendar rather than a button that would silently do nothing. */}
      {riskWeeksInView.length > 0 && worstWeek && (
        <div className="fn-mono mt-3 flex items-start gap-3 rounded-md border border-dashed border-[var(--fn-oxide)] bg-[var(--fn-oxide)]/5 px-3 py-2.5 text-xs text-[var(--fn-ink)]">
          <RiskWindow className="mt-0.5 h-3.5 w-8 shrink-0 text-[var(--fn-oxide)]" />
          <p className="leading-relaxed">
            {riskWeeksInView.length === 1 ? "1 week" : `${riskWeeksInView.length} weeks`} over target this month.{" "}
            Worst: <span className="font-semibold">{worstWeek.label}</span>,{" "}
            {formatMinutes(worstWeek.plannedMinutes)} planned vs {formatMinutes(worstWeek.capacityMinutes)} capacity (
            <span className="text-[var(--fn-oxide)]">
              {formatMinutes(worstWeek.plannedMinutes - worstWeek.capacityMinutes)} over
            </span>
            ).{" "}
            <Link href="/calendar" className="text-[var(--fn-cobalt)] underline underline-offset-2">
              Reschedule a block in Calendar
            </Link>
            .
          </p>
        </div>
      )}

      <div className="mt-3">
      {/* Week axis: one shared column grid drives the header, the lanes below, and the workload strip, so nothing needs its own separate week labels. */}
      <div className="fn-mono relative min-w-full overflow-x-auto text-[13px]">
        {breakBands.map((band) => (
          <div
            key={band.label + band.leftPercent}
            role="img"
            aria-label={`Break: ${band.label}`}
            title={band.label}
            className="pointer-events-none absolute inset-y-0 z-0"
            style={{ left: `${band.leftPercent}%`, width: `${band.widthPercent}%` }}
          >
            <div
              className="absolute inset-0"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(135deg, var(--fn-muted) 0, var(--fn-muted) 1px, transparent 1px, transparent 7px)",
                opacity: 0.18,
              }}
            />
            {band.widthPercent > 8 && (
              <span className="fn-mono absolute inset-x-0 top-0.5 block truncate px-1 text-center text-[9px] tracking-wide text-[var(--fn-muted)]">
                {band.label}
              </span>
            )}
          </div>
        ))}
        <div className="relative z-10 grid border-b border-[var(--fn-rule)]" style={{ gridTemplateColumns: columnTemplate }}>
          {displayedWeeks.map((week) => {
            const state = weekState(week.plannedMinutes, week.capacityMinutes);
            const isToday = week === todayWeek;
            const ticks = weekDayTicks(week, rangeEnd);
            const isExamWeek = examWeeks.has(week);
            const spanLabel =
              ticks.length > 1
                ? `${weekdayDateLabel(ticks[0].date.toISOString())} – ${weekdayDateLabel(ticks[ticks.length - 1].date.toISOString())}`
                : weekdayDateLabel(ticks[0]?.date.toISOString() ?? week.start.toISOString());
            return (
              <div
                key={week.label}
                title={`${WEEK_STATE_LABEL[state]}${isToday ? " · current week" : ""}${isExamWeek ? " · exam week" : ""} · ${spanLabel}`}
                className={`relative border-r border-b-2 border-[var(--fn-rule)] px-1 py-1.5 text-center text-[var(--fn-ink)] last:border-r-0 ${
                  isToday ? "border-b-[var(--fn-cobalt)]" : "border-b-transparent"
                }`}
              >
                {week.label}
                <span className="mt-0.5 block text-[10px] font-normal tracking-normal text-[var(--fn-muted)]">
                  {weekDayRangeLabel(week, rangeEnd)}
                </span>
                {isExamWeek && (
                  <span className="fn-mono mt-0.5 block text-[9px] font-semibold tracking-wider text-[var(--fn-oxide)]">
                    EXAM
                  </span>
                )}
                <WeekStateDot state={state} />
              </div>
            );
          })}
          {displayedWeeks.length === 0 && (
            <div className="border-b border-[var(--fn-rule)] px-1 py-1.5 text-center text-[var(--fn-muted)]">—</div>
          )}
        </div>
      </div>

      {/* Course lanes, the "today" hairline runs through them and the strip below at the same position. */}
      <div className="relative mt-6 flex flex-col gap-8">
        {breakBands.map((band) => (
          <div
            key={band.label + band.leftPercent}
            aria-hidden="true"
            className="pointer-events-none absolute top-0 bottom-0 z-0"
            style={{
              left: `calc(11rem + ${band.leftPercent}% * (100% - 11rem) / 100)`,
              width: `calc(${band.widthPercent}% * (100% - 11rem) / 100)`,
              backgroundImage:
                "repeating-linear-gradient(135deg, var(--fn-muted) 0, var(--fn-muted) 1px, transparent 1px, transparent 7px)",
              opacity: 0.18,
            }}
          />
        ))}
        {todayInRange && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-0 bottom-0 z-0 w-px bg-[var(--fn-oxide)] opacity-55"
            style={{ left: `calc(11rem + ${todayPercent}% * (100% - 11rem) / 100)` }}
          />
        )}
        {courses.map((course) => {
          const isIsolated = isolatedCourseId !== null;
          const isDimmed = isIsolated && isolatedCourseId !== course.id;
          return (
          <div
            key={course.id}
            className={`flex items-center gap-4 transition-opacity ${isDimmed ? "opacity-30" : ""}`}
          >
            <div className="flex w-40 shrink-0 items-center gap-1.5 truncate text-sm">
              <button
                type="button"
                onClick={() => setIsolatedCourseId(isolatedCourseId === course.id ? null : course.id)}
                title={isolatedCourseId === course.id ? "Show all courses" : `Focus on ${course.title}`}
                aria-pressed={isolatedCourseId === course.id}
                className="h-2.5 w-2.5 shrink-0 rounded-full ring-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--fn-cobalt)]"
                style={{
                  backgroundColor: course.colour,
                  boxShadow: isolatedCourseId === course.id ? `0 0 0 2px var(--fn-paper), 0 0 0 3px ${course.colour}` : undefined,
                }}
              />
              <Link
                href={`/courses/${course.id}`}
                className="truncate hover:underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--fn-cobalt)]"
              >
                <span className="fn-mono font-semibold" style={{ color: course.colour }}>
                  {course.code ?? course.title.slice(0, 6).toUpperCase()}
                </span>{" "}
                <span className="text-[var(--fn-ink)]">{course.title}</span>
              </Link>
            </div>
            <div className="relative flex-1 py-5">
              <CourseLaneLine color={course.colour} splitPercent={todayPercent} />
              {(() => {
                // Sorted by due date so collision staggering below only ever
                // compares neighbours in time, not arbitrary array order.
                const laneAssessments = assessments
                  .filter((a) => a.course_id === course.id && a.due_at >= rangeStart && a.due_at < rangeEnd)
                  .map((assessment) => ({ assessment, left: percentBetween(assessment.due_at, rangeStart, rangeEnd) }))
                  .sort((a, b) => a.left - b.left);

                // Two markers whose labels would sit closer than this (in
                // % of lane width) get their labels alternated onto a
                // second row instead of overlapping.
                const COLLISION_THRESHOLD_PERCENT = 9;
                let lastLeft: number | null = null;
                let row = 0;

                return laneAssessments.map(({ assessment, left }) => {
                  if (lastLeft !== null && left - lastLeft < COLLISION_THRESHOLD_PERCENT) {
                    row = row === 0 ? 1 : 0;
                  } else {
                    row = 0;
                  }
                  lastLeft = left;

                  const week = weekContaining(assessment.due_at, weeks);
                  const state: WeekState = week ? weekState(week.plannedMinutes, week.capacityMinutes) : "comfortable";
                  const atRisk = state === "at_risk" || state === "critical";
                  const weighting = assessment.grade_item_id
                    ? weighingByGradeItemId.get(assessment.grade_item_id)
                    : undefined;
                  return (
                    <Link
                      key={assessment.id}
                      href={`/assessments/${assessment.id}`}
                      className="absolute top-1/2 flex -translate-y-1/2 flex-col items-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--fn-cobalt)]"
                      style={{ left: `${left}%`, transform: "translate(-50%, -50%)", color: course.colour }}
                      title={`${assessment.title}, due ${weekdayDateLabel(assessment.due_at)}`}
                    >
                      {atRisk ? (
                        <RiskWindow className="h-4 w-10" />
                      ) : (
                        <AssessmentMarker className="h-4 w-4" />
                      )}
                      <span
                        className="fn-mono absolute top-full w-max max-w-24 truncate text-center text-[11px] text-[var(--fn-ink)]"
                        style={{ marginTop: row === 0 ? "0.25rem" : "1.25rem" }}
                      >
                        {assessment.title}
                        {weighting ? ` · ${weighting}%` : ""}
                      </span>
                    </Link>
                  );
                });
              })()}
            </div>
          </div>
          );
        })}
        {courses.length === 0 && (
          <p className="text-sm text-[var(--fn-muted)]">No courses in this semester yet.</p>
        )}
      </div>

      {/* Legend, mirrors legend.svg, rebuilt inline so it can't drift from the lanes above */}
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
        <span className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--fn-ochre)]" /> BUSY WEEK
        </span>
        <span className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full border border-[var(--fn-oxide)] bg-[var(--fn-oxide)]" /> CRITICAL WEEK
        </span>
        <span className="flex items-center gap-2">
          <span className="h-3 w-0 border-l-2 border-[var(--fn-cobalt)]" /> CURRENT WEEK
        </span>
        <span className="flex items-center gap-2">
          <span className="h-0 w-8 border-t-2 border-dashed border-[var(--fn-muted)] opacity-70" /> CAPACITY CEILING
        </span>
        <span className="flex items-center gap-2">
          <span className="fn-mono text-[9px] font-semibold tracking-wider text-[var(--fn-oxide)]">EXAM</span> EXAM WEEK
        </span>
        <span className="flex items-center gap-2">
          <span
            className="h-3.5 w-8"
            style={{
              backgroundImage:
                "repeating-linear-gradient(135deg, var(--fn-muted) 0, var(--fn-muted) 1px, transparent 1px, transparent 7px)",
              opacity: 0.5,
            }}
          />{" "}
          BREAK
        </span>
      </div>

      {/* Workload by day: same week-column grid as the axis above, each week split into its actual days so a spike points at the exact day, not just the week. Each day carries its own dashed capacity ceiling; a bar poking past it and turning oxide is a day that doesn't fit. */}
      <p className="fn-eyebrow mt-16">Workload by day (hours)</p>
      <div className="mt-3 grid overflow-x-auto pb-2" style={{ gridTemplateColumns: columnTemplate, height: "9rem" }}>
        {displayedWeeks.map((week) => {
          const clippedDays = week.days.filter((d) => d.date.toISOString() < rangeEnd);
          return (
            <div key={week.label} className="flex h-full items-end gap-px border-r border-[var(--fn-rule)]/60 px-px last:border-r-0">
              {clippedDays.map((day) => {
                const state = weekState(day.plannedMinutes, day.capacityMinutes);
                const isHighLoad = state === "at_risk" || state === "critical";
                const segments = [...day.plannedByCourse.entries()].sort((a, b) => (a[0] ?? -1) - (b[0] ?? -1));
                const ceilingPercent = Math.min(100, (day.capacityMinutes / 60 / maxDayHours) * 100);
                const isToday = todayInRange && day.date.toDateString() === new Date(now).toDateString();
                return (
                  <HoverBar
                    key={day.date.toISOString()}
                    tooltip={
                      <WorkloadTooltipContent
                        title={`${weekdayDateLabel(day.date.toISOString())}${day.isBreak ? " · break" : ""}`}
                        state={state}
                        plannedMinutes={day.plannedMinutes}
                        capacityMinutes={day.capacityMinutes}
                        plannedByCourse={day.plannedByCourse}
                        courses={courses}
                      />
                    }
                    style={
                      day.isBreak
                        ? {
                            // Faint hatch mixed into the stroke colour itself, not
                            // container opacity — this box also holds the actual
                            // bar content, which needs to stay fully opaque.
                            backgroundImage:
                              "repeating-linear-gradient(135deg, color-mix(in srgb, var(--fn-muted) 25%, transparent) 0, color-mix(in srgb, var(--fn-muted) 25%, transparent) 1px, transparent 1px, transparent 7px)",
                          }
                        : undefined
                    }
                  >
                    <div
                      className={`relative flex w-full flex-1 flex-col-reverse overflow-visible rounded-t ${isToday ? "ring-1 ring-[var(--fn-cobalt)]" : ""}`}
                      style={{ minHeight: "1px" }}
                    >
                      {day.capacityMinutes > 0 && (
                        <span
                          className="absolute inset-x-0 border-t border-dashed opacity-70"
                          style={{
                            bottom: `${ceilingPercent}%`,
                            borderColor: isHighLoad ? "var(--fn-oxide)" : "var(--fn-muted)",
                          }}
                        />
                      )}
                      {segments.map(([courseId, minutes]) => {
                        const colour = courseId ? (courses.find((c) => c.id === courseId)?.colour ?? OTHER_COLOUR) : OTHER_COLOUR;
                        const heightPercent = (minutes / 60 / maxDayHours) * 100;
                        return (
                          <div key={courseId ?? "other"} style={{ height: `${heightPercent}%`, backgroundColor: colour }} />
                        );
                      })}
                      {isHighLoad && <div className="absolute inset-x-0 top-0 h-1 bg-[var(--fn-oxide)]" />}
                    </div>
                  </HoverBar>
                );
              })}
            </div>
          );
        })}
        {displayedWeeks.length === 0 && <p className="text-sm text-[var(--fn-muted)]">No weeks in range.</p>}
      </div>

      {/* Term at a glance: the one place on this page that answers "is the whole semester on pace," not just the visible month. */}
      <p className="fn-eyebrow mt-10">Term at a glance</p>
      <div className="fn-mono mt-3 flex flex-wrap items-baseline gap-x-8 gap-y-2 border-t border-[var(--fn-rule)] pt-4 text-sm">
        <span>
          <span className="text-[var(--fn-muted)]">Credits </span>
          <span className="font-semibold text-[var(--fn-ink)]">{hasCreditData ? totalCredits : "— not set"}</span>
        </span>
        <Link href="/assessments" className="hover:underline underline-offset-2">
          <span className="text-[var(--fn-muted)]">Assessments remaining </span>
          <span className="font-semibold text-[var(--fn-cobalt)]">{assessmentsRemaining} →</span>
        </Link>
        <span className="flex items-center gap-1.5">
          <span className="text-[var(--fn-muted)]">Term average </span>
          <span className="font-semibold text-[var(--fn-ink)]">
            {termAverageRatio !== null ? `${Math.round(termAverageRatio * 100)}% of capacity` : "—"}
          </span>
          {termAverageState && (
            <span className="relative inline-block h-3 w-3">
              <WeekStateDot state={termAverageState} />
            </span>
          )}
        </span>
      </div>
      </div>
    </div>
  );
}
