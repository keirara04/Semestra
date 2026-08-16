"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import type { ClassSession, ClassSessionType, Course } from "@/lib/types";
import { useActiveSemester } from "@/lib/hooks/use-active-semester";
import { HOUR_HEIGHT_PX, hourLabel, timelineHours, timelineMinutesFromTime } from "@/lib/timeline";
import { EverytimeImportPanel } from "@/components/EverytimeImportPanel";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const SESSION_TYPES: ClassSessionType[] = ["lecture", "tutorial", "lab", "exam"];

// Non-colour type encoding, same rule the week-state system uses elsewhere
// on the semester map (shape carries meaning, colour alone never does):
// lecture stays a plain solid bar (the baseline type), tutorial dashes,
// lab dots, exam gets the same diagonal hatch that means "critical"
// everywhere else in the app — an exam block should read as urgent before
// anyone reads its label.
const TYPE_BORDER_STYLE: Record<ClassSessionType, "solid" | "dashed" | "dotted"> = {
  lecture: "solid",
  tutorial: "dashed",
  lab: "dotted",
  exam: "solid",
};

interface SessionForm {
  id: number | null;
  courseId: string;
  type: ClassSessionType;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  location: string;
}

const BLANK_FORM: SessionForm = {
  id: null,
  courseId: "",
  type: "lecture",
  dayOfWeek: "1",
  startTime: "09:00",
  endTime: "10:00",
  location: "",
};

// Weekly-pattern position on the shared timeline grid (see
// frontend/src/lib/timeline.ts) — same geometry the Calendar week view
// uses, computed directly from a ClassSession's own start/end rather than
// via /api/calendar/occurrences, so editing here always targets the base
// weekly pattern and never a one-off moved/cancelled exception.
function sessionPosition(session: ClassSession): { top: number; height: number } {
  const startMinutes = timelineMinutesFromTime(session.start_time.slice(0, 5));
  const endMinutes = timelineMinutesFromTime(session.end_time.slice(0, 5));
  const top = (startMinutes / 60) * HOUR_HEIGHT_PX;
  const height = Math.max(((endMinutes - startMinutes) / 60) * HOUR_HEIGHT_PX, 18);
  return { top, height };
}

export function TimetableWidget() {
  const queryClient = useQueryClient();
  const { activeSemester } = useActiveSemester();
  const { data: courses = [] } = useQuery({
    queryKey: qk.courses.all,
    queryFn: () => apiFetch<Course[]>("/api/courses"),
  });
  const { data: sessions } = useQuery({
    queryKey: qk.classSessions.all,
    queryFn: () => apiFetch<ClassSession[]>("/api/class-sessions"),
  });
  const [form, setForm] = useState<SessionForm | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const todayIndex = new Date().getDay();

  const semesterCourses = useMemo(
    () => courses.filter((course) => !activeSemester || course.semester_id === activeSemester.id),
    [courses, activeSemester],
  );
  const courseById = useMemo(() => new Map(courses.map((course) => [course.id, course])), [courses]);

  const visibleSessions = useMemo(() => {
    if (!sessions) return [];
    const semesterCourseIds = new Set(semesterCourses.map((course) => course.id));
    return sessions.filter((session) => semesterCourseIds.has(session.course_id));
  }, [sessions, semesterCourses]);

  async function handleCourseColourChange(courseId: number, colour: string) {
    queryClient.setQueryData(qk.courses.all, (current: Course[] | undefined) =>
      (current ?? []).map((c) => (c.id === courseId ? { ...c, colour } : c)),
    );
    const updated = await apiFetch<Course>(`/api/courses/${courseId}`, {
      method: "PUT",
      body: JSON.stringify({ colour }),
    });
    queryClient.setQueryData(qk.courses.all, (current: Course[] | undefined) =>
      (current ?? []).map((c) => (c.id === courseId ? updated : c)),
    );
  }

  function openNewForm() {
    setError(null);
    setForm({ ...BLANK_FORM, courseId: semesterCourses[0] ? String(semesterCourses[0].id) : "" });
  }

  function openEditForm(session: ClassSession) {
    setError(null);
    setForm({
      id: session.id,
      courseId: String(session.course_id),
      type: session.type,
      dayOfWeek: String(session.day_of_week),
      startTime: session.start_time.slice(0, 5),
      endTime: session.end_time.slice(0, 5),
      location: session.location ?? "",
    });
  }

  function closeForm() {
    setForm(null);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!form) return;
    setError(null);
    setSubmitting(true);
    try {
      const body = JSON.stringify({
        course_id: Number(form.courseId),
        type: form.type,
        day_of_week: Number(form.dayOfWeek),
        start_time: form.startTime,
        end_time: form.endTime,
        location: form.location || null,
      });

      if (form.id === null) {
        await apiFetch<ClassSession>("/api/class-sessions", { method: "POST", body });
      } else {
        await apiFetch<ClassSession>(`/api/class-sessions/${form.id}`, { method: "PUT", body });
      }
      await queryClient.invalidateQueries({ queryKey: qk.classSessions.all });
      closeForm();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!form || form.id === null) return;
    setSubmitting(true);
    try {
      await apiFetch(`/api/class-sessions/${form.id}`, { method: "DELETE" });
      await queryClient.invalidateQueries({ queryKey: qk.classSessions.all });
      closeForm();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between">
        <p className="fn-eyebrow">Timetable</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setImportOpen(true)}
            className="fn-mono text-[11px] text-[var(--fn-cobalt)] underline underline-offset-2"
          >
            Import from Everytime
          </button>
          <button type="button" onClick={openNewForm} className="fn-add-btn h-7 w-7" aria-label="Add class">
            <Plus size={14} strokeWidth={2.25} className="fn-add-btn-icon" />
          </button>
        </div>
      </div>

      {semesterCourses.length === 0 ? (
        <p className="mt-3 text-sm text-[var(--fn-muted)]">Add a course to build your timetable.</p>
      ) : (
        <div className="fn-scroll-fade mt-3 overflow-x-auto rounded-md border border-[var(--fn-rule)]">
          <div className="grid min-w-[640px] grid-cols-[3rem_repeat(7,1fr)]">
            <div className="border-b border-[var(--fn-rule)]" />
            {DAY_LABELS.map((label, dayIndex) => {
              const isToday = dayIndex === todayIndex;
              return (
                <div
                  key={label}
                  className={`fn-mono relative border-b border-l border-[var(--fn-rule)] py-1.5 text-center text-[11px] ${
                    isToday ? "text-[var(--fn-cobalt)] font-semibold" : "text-[var(--fn-muted)]"
                  }`}
                >
                  {isToday && (
                    <span
                      aria-hidden="true"
                      className="absolute -top-1.5 left-1/2 h-1.5 w-4 -translate-x-1/2 rounded-t-sm bg-[var(--fn-cobalt)]"
                    />
                  )}
                  {label}
                </div>
              );
            })}

            <div className="relative" style={{ height: timelineHours().length * HOUR_HEIGHT_PX }}>
              {timelineHours().map((hour, index) => (
                <div
                  key={hour}
                  className="fn-mono absolute right-1.5 -translate-y-1/2 text-[10px] text-[var(--fn-muted)]"
                  style={{ top: index * HOUR_HEIGHT_PX }}
                >
                  {hourLabel(hour)}
                </div>
              ))}
            </div>

            {DAY_LABELS.map((_, dayIndex) => (
              <div
                key={dayIndex}
                className={`relative border-l border-[var(--fn-rule)] ${
                  dayIndex === todayIndex ? "bg-[var(--fn-cobalt)]/[0.05]" : ""
                }`}
                style={{ height: timelineHours().length * HOUR_HEIGHT_PX }}
              >
                {timelineHours().map((hour, index) => (
                  <div
                    key={hour}
                    className="absolute inset-x-0 border-t border-[var(--fn-rule)]/60"
                    style={{ top: index * HOUR_HEIGHT_PX }}
                  />
                ))}
                {visibleSessions
                  .filter((session) => session.day_of_week === dayIndex)
                  .map((session) => {
                    const { top, height } = sessionPosition(session);
                    const colour = courseById.get(session.course_id)?.colour ?? "#2857A0";
                    const isExam = session.type === "exam";
                    return (
                      <button
                        key={session.id}
                        type="button"
                        onClick={() => openEditForm(session)}
                        className="absolute inset-x-0.5 overflow-hidden rounded px-1 py-0.5 text-left text-[10px] leading-tight"
                        style={{
                          top,
                          height,
                          backgroundColor: isExam
                            ? undefined
                            : `color-mix(in srgb, ${colour} 16%, var(--fn-paper))`,
                          backgroundImage: isExam
                            ? `repeating-linear-gradient(135deg, color-mix(in srgb, var(--fn-oxide) 35%, transparent) 0, color-mix(in srgb, var(--fn-oxide) 35%, transparent) 1.5px, transparent 1.5px, transparent 5px), color-mix(in srgb, var(--fn-oxide) 8%, var(--fn-paper))`
                            : undefined,
                          borderLeft: `3px ${TYPE_BORDER_STYLE[session.type]} ${isExam ? "var(--fn-oxide)" : colour}`,
                          color: "var(--fn-ink)",
                        }}
                      >
                        <span className="fn-mono block truncate font-semibold">
                          {courseById.get(session.course_id)?.title ?? "Class"}
                        </span>
                        {session.location && <span className="block truncate opacity-70">{session.location}</span>}
                      </button>
                    );
                  })}
              </div>
            ))}
          </div>
        </div>
      )}

      {form && (
        <div
          className="fn-popup-backdrop fixed inset-0 z-40 flex items-center justify-center bg-black/30 p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) closeForm();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={form.id === null ? "Add class" : "Edit class"}
            className="fn-popup-card w-full max-w-sm rounded-lg border border-[var(--fn-rule)] bg-[var(--fn-paper)] p-6 shadow-xl"
          >
            <div className="flex items-center justify-between">
              <p className="fn-eyebrow">{form.id === null ? "Add class" : "Edit class"}</p>
              <button
                type="button"
                onClick={closeForm}
                aria-label="Close"
                className="fn-mono text-lg leading-none text-[var(--fn-muted)] hover:text-[var(--fn-ink)]"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
              <label className="flex flex-col gap-1.5">
                <span className="fn-label">Course</span>
                <div className="flex items-center gap-2">
                  <select
                    value={form.courseId}
                    onChange={(event) => setForm({ ...form, courseId: event.target.value })}
                    required
                    className="fn-input flex-1"
                  >
                    {semesterCourses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.title}
                      </option>
                    ))}
                  </select>
                  {/* Colour belongs to the course, not this class session —
                      editing it here changes every block for this course,
                      timetable and calendar alike. */}
                  {form.courseId && (
                    <label
                      title="Change course colour"
                      className="relative h-9 w-9 shrink-0 cursor-pointer rounded-md border border-[var(--fn-rule)]"
                      style={{ backgroundColor: courseById.get(Number(form.courseId))?.colour }}
                    >
                      <input
                        type="color"
                        value={courseById.get(Number(form.courseId))?.colour ?? "#2857A0"}
                        onChange={(event) => handleCourseColourChange(Number(form.courseId), event.target.value)}
                        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                        aria-label="Course colour"
                      />
                    </label>
                  )}
                </div>
              </label>
              <div className="flex gap-3">
                <label className="flex flex-1 flex-col gap-1.5">
                  <span className="fn-label">Type</span>
                  <select
                    value={form.type}
                    onChange={(event) => setForm({ ...form, type: event.target.value as ClassSessionType })}
                    className="fn-input"
                  >
                    {SESSION_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type[0].toUpperCase() + type.slice(1)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-1 flex-col gap-1.5">
                  <span className="fn-label">Day</span>
                  <select
                    value={form.dayOfWeek}
                    onChange={(event) => setForm({ ...form, dayOfWeek: event.target.value })}
                    className="fn-input"
                  >
                    {DAY_LABELS.map((label, index) => (
                      <option key={label} value={index}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="flex gap-3">
                <label className="flex flex-1 flex-col gap-1.5">
                  <span className="fn-label">Start</span>
                  <input
                    type="time"
                    value={form.startTime}
                    onChange={(event) => setForm({ ...form, startTime: event.target.value })}
                    className="fn-input"
                  />
                </label>
                <label className="flex flex-1 flex-col gap-1.5">
                  <span className="fn-label">End</span>
                  <input
                    type="time"
                    value={form.endTime}
                    onChange={(event) => setForm({ ...form, endTime: event.target.value })}
                    className="fn-input"
                  />
                </label>
              </div>
              <label className="flex flex-col gap-1.5">
                <span className="fn-label">Location (optional)</span>
                <input
                  value={form.location}
                  onChange={(event) => setForm({ ...form, location: event.target.value })}
                  className="fn-input"
                />
              </label>

              {error && (
                <p role="alert" className="text-sm text-[var(--fn-oxide)]">
                  {error}
                </p>
              )}

              <div className="mt-1 flex items-center justify-between gap-3">
                {form.id !== null ? (
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={submitting}
                    className="fn-mono text-xs text-[var(--fn-oxide)] underline underline-offset-2"
                  >
                    Delete
                  </button>
                ) : (
                  <span />
                )}
                <button type="submit" disabled={submitting} className="fn-btn-primary !w-fit px-4">
                  {submitting ? "Saving…" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {importOpen && activeSemester && (
        <EverytimeImportPanel
          semesterId={activeSemester.id}
          onClose={() => setImportOpen(false)}
          onImported={() => {
            setImportOpen(false);
            queryClient.invalidateQueries({ queryKey: qk.classSessions.all });
            queryClient.invalidateQueries({ queryKey: qk.courses.all });
          }}
        />
      )}

      {/* Clicking Import before any semester exists/loads used to no-op
          silently — this makes the "nothing happened" case visible. */}
      {importOpen && !activeSemester && (
        <div
          className="fn-popup-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) setImportOpen(false);
          }}
        >
          <div className="fn-popup-card w-full max-w-sm rounded-lg border border-[var(--fn-rule)] bg-[var(--fn-paper)] p-6 shadow-xl">
            <p className="fn-eyebrow">Import from Everytime</p>
            <p className="mt-3 text-sm text-[var(--fn-muted)]">
              Add a semester first — the import needs one to attach courses to.
            </p>
            <button
              type="button"
              onClick={() => setImportOpen(false)}
              className="fn-btn-primary !w-fit mt-4 px-4 py-1.5"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
