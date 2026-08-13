"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { apiFetch, ApiError } from "@/lib/api";
import type { Course, Semester } from "@/lib/types";

const DEFAULT_COLOUR = "#2857A0";

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[] | null>(null);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [title, setTitle] = useState("");
  const [code, setCode] = useState("");
  const [semesterId, setSemesterId] = useState<string>("");
  const [colour, setColour] = useState(DEFAULT_COLOUR);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiFetch<Course[]>("/api/courses").then(setCourses);
    apiFetch<Semester[]>("/api/semesters").then((list) => {
      setSemesters(list);
      if (list.length > 0) setSemesterId(String(list[0].id));
    });
  }, []);

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
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="fn-sheet mx-auto min-h-dvh max-w-2xl px-6 py-10 md:my-6 md:rounded-2xl md:shadow-sm">
      <p className="fn-eyebrow">Courses</p>
      <h1 className="mt-1 text-2xl font-semibold">Your courses</h1>

      <ul className="mt-6 flex flex-col gap-2">
        {courses?.map((course) => (
          <li key={course.id}>
            <Link
              href={`/courses/${course.id}`}
              className="flex items-center gap-3 rounded-md border border-[var(--fn-rule)] px-3 py-2.5 text-sm transition-colors hover:bg-[var(--fn-canvas)]"
            >
              <span
                className="h-8 w-1 shrink-0 rounded-full"
                style={{ backgroundColor: course.colour }}
                aria-hidden
              />
              <span className="font-medium">{course.title}</span>
              {course.code && (
                <span className="fn-mono text-[var(--fn-muted)]">{course.code}</span>
              )}
            </Link>
          </li>
        ))}
        {courses?.length === 0 && (
          <li className="text-sm text-[var(--fn-muted)]">No courses yet — add one below.</li>
        )}
      </ul>

      {semesters.length === 0 ? (
        <p className="mt-8 text-sm text-[var(--fn-muted)]">
          Add a{" "}
          <Link href="/semester" className="text-[var(--fn-cobalt)] underline underline-offset-2">
            semester
          </Link>{" "}
          first.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
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
      )}
    </main>
  );
}
