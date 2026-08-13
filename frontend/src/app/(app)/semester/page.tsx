"use client";

import { useEffect, useState, type FormEvent } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import type { Assessment, CalendarBlock, Course, DayCapacity, Semester } from "@/lib/types";
import { WeekStateMarker, weekState } from "@/components/WeekState";

function pickCurrentSemester(semesters: Semester[]): Semester | null {
  if (semesters.length === 0) return null;
  const today = new Date().toISOString().slice(0, 10);
  const current = semesters.find((s) => s.start_date <= today && today <= s.end_date);
  if (current) return current;
  const future = semesters
    .filter((s) => s.start_date > today)
    .sort((a, b) => a.start_date.localeCompare(b.start_date))[0];
  return future ?? semesters[semesters.length - 1];
}

// Semester setup + map — see "Primary navigation" (Semester row: "the
// term-long course-lane view") and "Semester map rules" in
// mdfile/DESIGN.md.
export default function SemesterPage() {
  const [semesters, setSemesters] = useState<Semester[] | null>(null);
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showTermsForm, setShowTermsForm] = useState(false);

  useEffect(() => {
    apiFetch<Semester[]>("/api/semesters").then(setSemesters);
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const created = await apiFetch<Semester>("/api/semesters", {
        method: "POST",
        body: JSON.stringify({ name, start_date: startDate, end_date: endDate }),
      });
      setSemesters((current) => [...(current ?? []), created]);
      setName("");
      setStartDate("");
      setEndDate("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  const current = semesters ? pickCurrentSemester(semesters) : null;

  return (
    <main className="fn-sheet mx-auto min-h-dvh max-w-4xl px-6 py-10 md:my-6 md:rounded-2xl md:shadow-sm">
      <p className="fn-eyebrow">Semester</p>
      <h1 className="mt-1 text-2xl font-semibold">{current?.name ?? "Terms"}</h1>

      {current && <SemesterMap semester={current} />}

      <div className="mt-10 border-t border-[var(--fn-rule)] pt-6">
        <button
          type="button"
          onClick={() => setShowTermsForm((value) => !value)}
          className="fn-mono text-xs text-[var(--fn-muted)] underline underline-offset-2"
        >
          {showTermsForm ? "Hide" : "Manage terms"}
        </button>

        {showTermsForm && (
          <>
            <ul className="mt-4 flex flex-col divide-y divide-[var(--fn-rule)]">
              {semesters?.map((semester) => (
                <li key={semester.id} className="flex items-baseline justify-between py-2.5 text-sm">
                  <span className="font-medium">{semester.name}</span>
                  <span className="fn-mono text-[var(--fn-muted)]">
                    {semester.start_date} – {semester.end_date}
                  </span>
                </li>
              ))}
              {semesters?.length === 0 && (
                <li className="py-2.5 text-sm text-[var(--fn-muted)]">No semesters yet — add one below.</li>
              )}
            </ul>

            <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
              <label className="flex flex-col gap-1.5">
                <span className="fn-label">Name</span>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                  className="fn-input"
                  placeholder="Fall 2026"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="fn-label">Start date</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                  required
                  className="fn-input"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="fn-label">End date</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                  required
                  className="fn-input"
                />
              </label>

              {error && (
                <p role="alert" className="text-sm text-[var(--fn-oxide)]">
                  {error}
                </p>
              )}

              <button type="submit" disabled={submitting} className="fn-btn-primary !w-fit px-4">
                {submitting ? "Saving…" : "Add semester"}
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}

interface Week {
  start: string;
  label: string;
  plannedMinutes: number;
  capacityMinutes: number;
}

function buildWeeks(startDate: string, endDate: string, days: DayCapacity[], blocks: CalendarBlock[]): Week[] {
  const capacityByDate = new Map(days.map((d) => [d.date, d.recommended_study_minutes]));
  const plannedByDate = new Map<string, number>();
  for (const block of blocks) {
    if (block.status === "skipped") continue;
    const date = block.start_at.slice(0, 10);
    const minutes = (new Date(block.end_at).getTime() - new Date(block.start_at).getTime()) / 60_000;
    plannedByDate.set(date, (plannedByDate.get(date) ?? 0) + minutes);
  }

  const weeks: Week[] = [];
  const cursor = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  let weekNumber = 1;

  while (cursor <= end) {
    let plannedMinutes = 0;
    let capacityMinutes = 0;
    const weekStartLabel = cursor.toLocaleDateString(undefined, { month: "short", day: "numeric" });

    for (let i = 0; i < 7 && cursor <= end; i++) {
      const dateString = cursor.toISOString().slice(0, 10);
      capacityMinutes += capacityByDate.get(dateString) ?? 0;
      plannedMinutes += plannedByDate.get(dateString) ?? 0;
      cursor.setDate(cursor.getDate() + 1);
    }

    weeks.push({ start: weekStartLabel, label: `W${weekNumber}`, plannedMinutes, capacityMinutes });
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

function SemesterMap({ semester }: { semester: Semester }) {
  const [courses, setCourses] = useState<Course[] | null>(null);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [days, setDays] = useState<DayCapacity[]>([]);
  const [blocks, setBlocks] = useState<CalendarBlock[]>([]);

  useEffect(() => {
    Promise.all([
      apiFetch<Course[]>("/api/courses"),
      apiFetch<Assessment[]>("/api/assessments"),
      apiFetch<DayCapacity[]>(
        `/api/calendar/capacity?from=${semester.start_date}&to=${semester.end_date}`,
      ),
      apiFetch<CalendarBlock[]>("/api/calendar-blocks"),
    ]).then(([allCourses, allAssessments, capacityDays, allBlocks]) => {
      setCourses(allCourses.filter((c) => c.semester_id === semester.id));
      setAssessments(allAssessments);
      setDays(capacityDays);
      setBlocks(allBlocks);
    });
  }, [semester.id, semester.start_date, semester.end_date]);

  if (!courses) return null;

  const weeks = buildWeeks(semester.start_date, semester.end_date, days, blocks);

  return (
    <div className="mt-6">
      <p className="fn-eyebrow">Workload by week</p>
      <div className="mt-2 flex gap-1 overflow-x-auto pb-2">
        {weeks.map((week) => {
          const state = weekState(week.plannedMinutes, week.capacityMinutes);
          return (
            <div
              key={week.label}
              className="flex w-16 shrink-0 flex-col items-center gap-1 rounded border border-[var(--fn-rule)] px-1 py-2"
            >
              <span className="fn-mono text-[10px] text-[var(--fn-muted)]">{week.label}</span>
              <WeekStateMarker state={state} />
            </div>
          );
        })}
        {weeks.length === 0 && <p className="text-sm text-[var(--fn-muted)]">No weeks in range.</p>}
      </div>

      <p className="fn-eyebrow mt-8">Courses</p>
      <div className="mt-3 flex flex-col gap-3">
        {courses.map((course) => (
          <div key={course.id} className="flex items-center gap-3">
            <div className="w-28 shrink-0 truncate text-sm font-medium">{course.title}</div>
            <div className="relative h-6 flex-1 rounded bg-[var(--fn-canvas)]">
              <div
                className="absolute inset-y-0 left-0 w-full rounded opacity-20"
                style={{ backgroundColor: course.colour }}
                aria-hidden
              />
              {assessments
                .filter((a) => a.course_id === course.id)
                .map((assessment) => (
                  <div
                    key={assessment.id}
                    className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[var(--fn-paper)]"
                    style={{
                      left: `${percentBetween(assessment.due_at, semester.start_date, semester.end_date)}%`,
                      backgroundColor: course.colour,
                    }}
                    title={`${assessment.title} — due ${new Date(assessment.due_at).toLocaleDateString()}`}
                  />
                ))}
            </div>
          </div>
        ))}
        {courses.length === 0 && (
          <p className="text-sm text-[var(--fn-muted)]">No courses in this semester yet.</p>
        )}
      </div>
    </div>
  );
}
