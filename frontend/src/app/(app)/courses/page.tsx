"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { apiFetch, ApiError } from "@/lib/api";
import type { Course, Semester } from "@/lib/types";

const DEFAULT_COLOUR = "#4f6df5";

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
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-xl font-semibold">Courses</h1>

      <ul className="mt-6 flex flex-col gap-2">
        {courses?.map((course) => (
          <li key={course.id}>
            <Link
              href={`/courses/${course.id}`}
              className="flex items-center gap-2 rounded border px-3 py-2 text-sm hover:bg-gray-50"
            >
              <span
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: course.colour }}
              />
              <span className="font-medium">{course.title}</span>
              {course.code && <span className="text-gray-600">{course.code}</span>}
            </Link>
          </li>
        ))}
        {courses?.length === 0 && (
          <li className="text-sm text-gray-600">No courses yet — add one below.</li>
        )}
      </ul>

      {semesters.length === 0 ? (
        <p className="mt-8 text-sm text-gray-600">
          Add a{" "}
          <Link href="/semester" className="underline">
            semester
          </Link>{" "}
          first.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            Semester
            <select
              value={semesterId}
              onChange={(event) => setSemesterId(event.target.value)}
              className="rounded border px-3 py-2"
            >
              {semesters.map((semester) => (
                <option key={semester.id} value={semester.id}>
                  {semester.name}
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
              placeholder="Deep Learning"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Code (optional)
            <input
              value={code}
              onChange={(event) => setCode(event.target.value)}
              className="rounded border px-3 py-2"
              placeholder="CS4001"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Colour
            <input
              type="color"
              value={colour}
              onChange={(event) => setColour(event.target.value)}
              className="h-10 w-16 rounded border"
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
            {submitting ? "Saving…" : "Add course"}
          </button>
        </form>
      )}
    </main>
  );
}
