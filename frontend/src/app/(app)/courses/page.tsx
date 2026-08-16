"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { apiFetch, ApiError, logApiError } from "@/lib/api";
import type { Assessment, AssessmentType, Course } from "@/lib/types";
import { useActiveSemester } from "@/lib/hooks/use-active-semester";
import { daysUntil } from "@/lib/format";
import { HelpTooltip } from "@/components/HelpTooltip";

const DEFAULT_COLOUR = "#2857A0";

const ASSESSMENT_TYPES: AssessmentType[] = [
  "report",
  "quiz",
  "lab",
  "project",
  "participation",
  "midterm",
  "final",
  "exam",
  "other",
];

const ASSESSMENT_STATUS_LABEL: Record<Assessment["status"], string> = {
  not_started: "Not started",
  in_progress: "In progress",
  blocked: "Blocked",
  done: "Done",
};

export default function CoursesPage() {
  return (
    <Suspense fallback={null}>
      <CoursesPageInner />
    </Suspense>
  );
}

function CoursesPageInner() {
  const { semesters, activeSemester, setActiveSemester } = useActiveSemester();
  const [courses, setCourses] = useState<Course[] | null>(null);
  // "all" is its own local filter state, not part of the shared active-semester
  // param: it's a courses-list-only view, not something the calendar/semester
  // pages should ever pick up.
  const [activeSemesterId, setActiveSemesterId] = useState<"all" | number>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [code, setCode] = useState("");
  const [semesterId, setSemesterId] = useState<string>("");
  const [colour, setColour] = useState(DEFAULT_COLOUR);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Cross-course deliverables — the "every deliverable, across courses"
  // view previously lived at its own /assessments nav destination; folded
  // in here since Courses is where deliverables now live end to end (a
  // single course's own deliverables are on its /courses/[id] tab, this
  // is the "all of them at once" scope one level up).
  const [assessments, setAssessments] = useState<Assessment[] | null>(null);
  const [assessmentFormOpen, setAssessmentFormOpen] = useState(false);
  const [assessmentCourseId, setAssessmentCourseId] = useState("");
  const [assessmentType, setAssessmentType] = useState<AssessmentType>("report");
  const [assessmentTitle, setAssessmentTitle] = useState("");
  const [assessmentDueAt, setAssessmentDueAt] = useState("");
  const [assessmentError, setAssessmentError] = useState<string | null>(null);
  const [assessmentSubmitting, setAssessmentSubmitting] = useState(false);

  useEffect(() => {
    apiFetch<Course[]>("/api/courses")
      .then(setCourses)
      .catch((error) => {
        setCourses([]);
        logApiError(error);
      });
    apiFetch<Assessment[]>("/api/assessments")
      .then(setAssessments)
      .catch((error) => {
        setAssessments([]);
        logApiError(error);
      });
  }, []);

  function openForm() {
    setError(null);
    // Default the create form's semester to whichever term is active
    // app-wide, not just the earliest one (the API orders by start_date,
    // so "first in the list" is usually the wrong default) — set lazily
    // on open rather than in an effect, same as the deliverable form's
    // course default below.
    if (activeSemester && !semesterId) setSemesterId(String(activeSemester.id));
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const created = await apiFetch<Course>("/api/courses", {
        method: "POST",
        body: JSON.stringify({
          semester_id: Number(semesterId),
          title,
          code: code || null,
          colour,
        }),
      });
      setCourses((current) => [...(current ?? []), created]);
      setTitle("");
      setCode("");
      setColour(DEFAULT_COLOUR);
      setFormOpen(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  const visibleCourses = (courses ?? []).filter(
    (course) => activeSemesterId === "all" || course.semester_id === activeSemesterId,
  );

  const visibleCourseIds = new Set(visibleCourses.map((course) => course.id));
  const visibleAssessments = (assessments ?? [])
    .filter((assessment) => visibleCourseIds.has(assessment.course_id))
    .slice()
    .sort((a, b) => a.due_at.localeCompare(b.due_at));

  function openAssessmentForm() {
    setAssessmentError(null);
    if (!assessmentCourseId && courses?.[0]) setAssessmentCourseId(String(courses[0].id));
    setAssessmentFormOpen(true);
  }

  function closeAssessmentForm() {
    setAssessmentFormOpen(false);
  }

  async function handleAssessmentSubmit(event: FormEvent) {
    event.preventDefault();
    setAssessmentError(null);
    setAssessmentSubmitting(true);
    try {
      const created = await apiFetch<Assessment>("/api/assessments", {
        method: "POST",
        body: JSON.stringify({
          course_id: Number(assessmentCourseId),
          type: assessmentType,
          title: assessmentTitle,
          due_at: assessmentDueAt,
        }),
      });
      setAssessments((current) => [...(current ?? []), created]);
      setAssessmentTitle("");
      setAssessmentDueAt("");
      setAssessmentFormOpen(false);
    } catch (err) {
      setAssessmentError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setAssessmentSubmitting(false);
    }
  }

  async function handleAssessmentDelete(assessment: Assessment) {
    await apiFetch(`/api/assessments/${assessment.id}`, { method: "DELETE" });
    setAssessments((current) => current?.filter((item) => item.id !== assessment.id) ?? null);
  }

  return (
    <main className="bg-[var(--fn-paper)] min-h-dvh w-full px-8 py-10 md:px-12">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="fn-eyebrow">Courses</p>
          <h1 className="mt-1 text-2xl font-semibold">Your courses</h1>
        </div>
        {semesters.length > 0 && (
          <button type="button" onClick={openForm} className="fn-add-btn" aria-label="Add course">
            <Plus size={18} strokeWidth={2.25} className="fn-add-btn-icon" />
          </button>
        )}
      </div>

      {semesters.length === 0 ? (
        <p className="mt-8 text-sm text-[var(--fn-muted)]">
          Add a{" "}
          <Link href="/semester" className="text-[var(--fn-cobalt)] underline underline-offset-2">
            semester
          </Link>{" "}
          first.
        </p>
      ) : (
        <>
          <div className="fn-view-toggle mt-6 flex-wrap">
            <button
              type="button"
              onClick={() => setActiveSemesterId("all")}
              className={`fn-view-toggle-btn ${activeSemesterId === "all" ? "fn-view-toggle-btn--active" : ""}`}
            >
              All
            </button>
            {semesters.map((semester) => (
              <button
                key={semester.id}
                type="button"
                onClick={() => {
                  setActiveSemesterId(semester.id);
                  setActiveSemester(semester.id);
                }}
                className={`fn-view-toggle-btn ${activeSemesterId === semester.id ? "fn-view-toggle-btn--active" : ""}`}
              >
                {semester.name}
              </button>
            ))}
          </div>

        <ul className="mt-4 flex flex-col gap-2">
          {visibleCourses.map((course) => (
            <li key={course.id}>
              <Link
                href={`/courses/${course.id}`}
                className="flex items-center gap-4 rounded-lg border border-[var(--fn-rule)] bg-[var(--fn-canvas)]/40 px-4 py-3.5 transition-colors hover:bg-[var(--fn-canvas)]"
              >
                <span
                  className="h-10 w-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: course.colour }}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{course.title}</p>
                  <p className="fn-mono mt-0.5 truncate text-xs text-[var(--fn-muted)]">
                    {[course.code, course.instructor, course.credits ? `${course.credits} credits` : null]
                      .filter(Boolean)
                      .join(" · ") || "No details yet"}
                  </p>
                </div>
                {course.grade_target && (
                  <span className="fn-mono shrink-0 text-[11px] text-[var(--fn-muted)]">
                    Target {course.grade_target}
                  </span>
                )}
              </Link>
            </li>
          ))}
          {courses?.length === 0 && (
            <li className="rounded-lg border border-dashed border-[var(--fn-rule)] px-4 py-6 text-center text-sm text-[var(--fn-muted)]">
              No courses yet. Add one to get started.
            </li>
          )}
          {courses !== null && courses.length > 0 && visibleCourses.length === 0 && (
            <li className="rounded-lg border border-dashed border-[var(--fn-rule)] px-4 py-6 text-center text-sm text-[var(--fn-muted)]">
              No courses in this semester.
            </li>
          )}
        </ul>

        {courses !== null && courses.length > 0 && (
          <div className="mt-10">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <p className="fn-eyebrow">Deliverables</p>
                <HelpTooltip label="What are deliverables?">
                  Deliverables are graded coursework — assignments, quizzes, exams, projects — each with
                  a due date and a status. This list spans every course; add one and it also shows up on
                  that course&apos;s own Deliverables tab.
                </HelpTooltip>
              </span>
              <button
                type="button"
                onClick={openAssessmentForm}
                className="fn-add-btn h-7 w-7"
                aria-label="Add deliverable"
              >
                <Plus size={14} strokeWidth={2.25} className="fn-add-btn-icon" />
              </button>
            </div>

            <ul className="mt-3 flex flex-col gap-2">
              {visibleAssessments.map((assessment) => {
                const course = courses?.find((item) => item.id === assessment.course_id);
                return (
                  <li key={assessment.id}>
                    <div className="flex items-center gap-3 rounded-md border border-[var(--fn-rule)] px-3 py-2.5 text-sm">
                      <Link href={`/assessments/${assessment.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                        {course && (
                          <span
                            className="h-8 w-1 shrink-0 rounded-full"
                            style={{ backgroundColor: course.colour }}
                            aria-hidden
                          />
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">{assessment.title}</span>
                          <span className="fn-mono text-[var(--fn-muted)]">{course?.title ?? "N/A"}</span>
                        </span>
                        <span className="fn-mono shrink-0 text-[var(--fn-muted)]">{daysUntil(assessment.due_at)}</span>
                        <span className="fn-mono shrink-0 text-[11px] text-[var(--fn-muted)]">
                          {ASSESSMENT_STATUS_LABEL[assessment.status]}
                        </span>
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleAssessmentDelete(assessment)}
                        className="shrink-0 text-[11px] text-[var(--fn-oxide)] underline underline-offset-2"
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                );
              })}
              {visibleAssessments.length === 0 && (
                <li className="rounded-lg border border-dashed border-[var(--fn-rule)] px-4 py-6 text-center text-sm text-[var(--fn-muted)]">
                  No deliverables yet. Add one to get started.
                </li>
              )}
            </ul>
          </div>
        )}
        </>
      )}

      {formOpen && (
        <div
          className="fn-popup-backdrop fixed inset-0 z-40 flex items-center justify-center bg-black/30 p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) closeForm();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Add course"
            className="fn-popup-card max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg border border-[var(--fn-rule)] bg-[var(--fn-paper)] p-6 shadow-xl"
          >
            <div className="flex items-center justify-between">
              <p className="fn-eyebrow">Add course</p>
              <button
                type="button"
                onClick={closeForm}
                aria-label="Close"
                className="fn-mono text-lg leading-none text-[var(--fn-muted)] hover:text-[var(--fn-ink)]"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
              <label className="flex flex-col gap-1.5">
                <span className="fn-label">Semester</span>
                <select
                  value={semesterId}
                  onChange={(event) => setSemesterId(event.target.value)}
                  className="fn-input"
                >
                  {semesters.map((semester) => (
                    <option key={semester.id} value={semester.id}>
                      {semester.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="fn-label">Title</span>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  required
                  autoFocus
                  className="fn-input"
                  placeholder="Deep Learning"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="fn-label">Code (optional)</span>
                <input
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  className="fn-input"
                  placeholder="CS4001"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="fn-label">Colour</span>
                <input
                  type="color"
                  value={colour}
                  onChange={(event) => setColour(event.target.value)}
                  className="h-10 w-16 rounded-md border border-[var(--fn-rule)]"
                />
              </label>

              {error && (
                <p role="alert" className="text-sm text-[var(--fn-oxide)]">
                  {error}
                </p>
              )}

              <button type="submit" disabled={submitting} className="fn-btn-primary !w-fit px-4">
                {submitting ? "Saving…" : "Add course"}
              </button>
            </form>
          </div>
        </div>
      )}

      {assessmentFormOpen && (
        <div
          className="fn-popup-backdrop fixed inset-0 z-40 flex items-center justify-center bg-black/30 p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) closeAssessmentForm();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Add deliverable"
            className="fn-popup-card max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg border border-[var(--fn-rule)] bg-[var(--fn-paper)] p-6 shadow-xl"
          >
            <div className="flex items-center justify-between">
              <p className="fn-eyebrow">Add deliverable</p>
              <button
                type="button"
                onClick={closeAssessmentForm}
                aria-label="Close"
                className="fn-mono text-lg leading-none text-[var(--fn-muted)] hover:text-[var(--fn-ink)]"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleAssessmentSubmit} className="mt-4 flex flex-col gap-4">
              <label className="flex flex-col gap-1.5">
                <span className="fn-label">Course</span>
                <select
                  value={assessmentCourseId}
                  onChange={(event) => setAssessmentCourseId(event.target.value)}
                  className="fn-input"
                >
                  {(courses ?? []).map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.title}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="fn-label">Type</span>
                <select
                  value={assessmentType}
                  onChange={(event) => setAssessmentType(event.target.value as AssessmentType)}
                  className="fn-input"
                >
                  {ASSESSMENT_TYPES.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="fn-label">Title</span>
                <input
                  value={assessmentTitle}
                  onChange={(event) => setAssessmentTitle(event.target.value)}
                  required
                  autoFocus
                  className="fn-input"
                  placeholder="Midterm report"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="fn-label">Due</span>
                <input
                  type="datetime-local"
                  value={assessmentDueAt}
                  onChange={(event) => setAssessmentDueAt(event.target.value)}
                  required
                  className="fn-input"
                />
              </label>

              {assessmentError && (
                <p role="alert" className="text-sm text-[var(--fn-oxide)]">
                  {assessmentError}
                </p>
              )}

              <button type="submit" disabled={assessmentSubmitting} className="fn-btn-primary !w-fit px-4">
                {assessmentSubmitting ? "Saving…" : "Add deliverable"}
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
