"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { apiFetch, ApiError } from "@/lib/api";
import type { Assessment, AssessmentType, Course } from "@/lib/types";
import { daysUntil } from "@/lib/format";

const TYPES: AssessmentType[] = [
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

const STATUS_LABEL: Record<Assessment["status"], string> = {
  not_started: "Not started",
  in_progress: "In progress",
  blocked: "Blocked",
  done: "Done",
};

export default function AssessmentsPage() {
  const [assessments, setAssessments] = useState<Assessment[] | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseId, setCourseId] = useState("");
  const [type, setType] = useState<AssessmentType>("report");
  const [title, setTitle] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiFetch<Assessment[]>("/api/assessments").then(setAssessments);
    apiFetch<Course[]>("/api/courses").then((list) => {
      setCourses(list);
      if (list.length > 0) setCourseId(String(list[0].id));
    });
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const created = await apiFetch<Assessment>("/api/assessments", {
        method: "POST",
        body: JSON.stringify({
          course_id: Number(courseId),
          type,
          title,
          due_at: dueAt,
        }),
      });
      setAssessments((current) => [...(current ?? []), created]);
      setTitle("");
      setDueAt("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="fn-sheet min-h-dvh w-full px-8 py-10 md:px-12">
      <p className="fn-eyebrow">Assessments</p>
      <h1 className="mt-1 text-2xl font-semibold">Every assessment, across courses</h1>

      <ul className="mt-6 flex flex-col gap-2">
        {assessments
          ?.slice()
          .sort((a, b) => a.due_at.localeCompare(b.due_at))
          .map((assessment) => {
            const course = courses.find((item) => item.id === assessment.course_id);
            return (
              <li key={assessment.id}>
                <Link
                  href={`/assessments/${assessment.id}`}
                  className="flex items-center gap-3 rounded-md border border-[var(--fn-rule)] px-3 py-2.5 text-sm transition-colors hover:bg-[var(--fn-canvas)]"
                >
                  {course && (
                    <span
                      className="h-8 w-1 shrink-0 rounded-full"
                      style={{ backgroundColor: course.colour }}
                      aria-hidden
                    />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{assessment.title}</span>
                    <span className="fn-mono text-[var(--fn-muted)]">{course?.title ?? "—"}</span>
                  </span>
                  <span className="fn-mono shrink-0 text-[var(--fn-muted)]">
                    {daysUntil(assessment.due_at)}
                  </span>
                  <span className="fn-mono shrink-0 text-[11px] text-[var(--fn-muted)]">
                    {STATUS_LABEL[assessment.status]}
                  </span>
                </Link>
              </li>
            );
          })}
        {assessments?.length === 0 && (
          <li className="text-sm text-[var(--fn-muted)]">No assessments yet — add one below.</li>
        )}
      </ul>

      {courses.length === 0 ? (
        <p className="mt-8 text-sm text-[var(--fn-muted)]">
          Add a{" "}
          <Link href="/courses" className="text-[var(--fn-cobalt)] underline underline-offset-2">
            course
          </Link>{" "}
          first.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="fn-label">Course</span>
            <select
              value={courseId}
              onChange={(event) => setCourseId(event.target.value)}
              className="fn-input"
            >
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="fn-label">Type</span>
            <select
              value={type}
              onChange={(event) => setType(event.target.value as AssessmentType)}
              className="fn-input"
            >
              {TYPES.map((option) => (
                <option key={option} value={option}>
                  {option}
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
              className="fn-input"
              placeholder="Korean Sign Language Report"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="fn-label">Due</span>
            <input
              type="datetime-local"
              value={dueAt}
              onChange={(event) => setDueAt(event.target.value)}
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
            {submitting ? "Saving…" : "Add assessment"}
          </button>
        </form>
      )}
    </main>
  );
}
