"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { apiFetch, ApiError } from "@/lib/api";
import type { Assessment, AssessmentType, Course } from "@/lib/types";

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

  const courseTitle = (id: number) => courses.find((course) => course.id === id)?.title ?? "";

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-xl font-semibold">Assessments</h1>

      <ul className="mt-6 flex flex-col gap-2">
        {assessments
          ?.slice()
          .sort((a, b) => a.due_at.localeCompare(b.due_at))
          .map((assessment) => (
            <li key={assessment.id}>
              <Link
                href={`/assessments/${assessment.id}`}
                className="flex flex-col rounded border px-3 py-2 text-sm hover:bg-gray-50"
              >
                <span className="font-medium">{assessment.title}</span>
                <span className="text-gray-600">
                  {courseTitle(assessment.course_id)} · due{" "}
                  {new Date(assessment.due_at).toLocaleDateString()} · {assessment.status}
                </span>
              </Link>
            </li>
          ))}
        {assessments?.length === 0 && (
          <li className="text-sm text-gray-600">No assessments yet — add one below.</li>
        )}
      </ul>

      {courses.length === 0 ? (
        <p className="mt-8 text-sm text-gray-600">
          Add a{" "}
          <Link href="/courses" className="underline">
            course
          </Link>{" "}
          first.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            Course
            <select
              value={courseId}
              onChange={(event) => setCourseId(event.target.value)}
              className="rounded border px-3 py-2"
            >
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Type
            <select
              value={type}
              onChange={(event) => setType(event.target.value as AssessmentType)}
              className="rounded border px-3 py-2"
            >
              {TYPES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Title
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
              className="rounded border px-3 py-2"
              placeholder="Korean Sign Language Report"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Due
            <input
              type="datetime-local"
              value={dueAt}
              onChange={(event) => setDueAt(event.target.value)}
              required
              className="rounded border px-3 py-2"
            />
          </label>

          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-fit rounded border px-3 py-2 text-sm"
          >
            {submitting ? "Saving…" : "Add assessment"}
          </button>
        </form>
      )}
    </main>
  );
}
