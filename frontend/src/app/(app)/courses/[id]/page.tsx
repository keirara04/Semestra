"use client";

import { useEffect, useState, type FormEvent } from "react";
import { use } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import type { ClassSession, ClassSessionType, Course } from "@/lib/types";

const TABS = ["Overview", "Assessments", "Materials", "Revision", "Grades", "Insights"] as const;

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

type CourseWithSessions = Course & { class_sessions: ClassSession[] };

// Course workspace shell — see "Course workspace" in the plan. Only
// Overview is functional this phase; the rest are Foundation-release
// placeholders until Planning Engine / Academic Intelligence land.
export default function CourseWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [course, setCourse] = useState<CourseWithSessions | null>(null);
  const [tab, setTab] = useState<(typeof TABS)[number]>("Overview");

  useEffect(() => {
    apiFetch<CourseWithSessions>(`/api/courses/${id}`).then(setCourse);
  }, [id]);

  if (!course) return null;

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <div className="flex items-center gap-2">
        <span
          className="h-3 w-3 rounded-full"
          style={{ backgroundColor: course.colour }}
        />
        <h1 className="text-xl font-semibold">{course.title}</h1>
      </div>
      <p className="mt-1 text-sm text-gray-600">
        {[course.instructor, course.credits ? `${course.credits} credits` : null, course.grade_target]
          .filter(Boolean)
          .join(" · ")}
      </p>

      <nav className="mt-6 flex gap-4 border-b text-sm">
        {TABS.map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => setTab(name)}
            className={`-mb-px border-b-2 px-1 py-2 ${
              tab === name ? "border-black font-medium" : "border-transparent text-gray-500"
            }`}
          >
            {name}
          </button>
        ))}
      </nav>

      {tab === "Overview" ? (
        <Overview course={course} onSessionCreated={(session) =>
          setCourse((current) =>
            current ? { ...current, class_sessions: [...current.class_sessions, session] } : current,
          )
        } />
      ) : (
        <p className="mt-6 text-sm text-gray-600">
          {tab} isn&apos;t built yet — this ships in a later release.
        </p>
      )}
    </main>
  );
}

function Overview({
  course,
  onSessionCreated,
}: {
  course: CourseWithSessions;
  onSessionCreated: (session: ClassSession) => void;
}) {
  const [type, setType] = useState<ClassSessionType>("lecture");
  const [dayOfWeek, setDayOfWeek] = useState("1");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [location, setLocation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const created = await apiFetch<ClassSession>("/api/class-sessions", {
        method: "POST",
        body: JSON.stringify({
          course_id: course.id,
          type,
          day_of_week: Number(dayOfWeek),
          start_time: startTime,
          end_time: endTime,
          location: location || null,
        }),
      });
      onSessionCreated(created);
      setLocation("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-6">
      <h2 className="text-sm font-medium">Weekly schedule</h2>
      <ul className="mt-3 flex flex-col gap-2">
        {course.class_sessions.map((session) => (
          <li key={session.id} className="rounded border px-3 py-2 text-sm">
            {DAYS[session.day_of_week]} · {session.start_time.slice(0, 5)}–
            {session.end_time.slice(0, 5)} · {session.type}
            {session.location && ` · ${session.location}`}
          </li>
        ))}
        {course.class_sessions.length === 0 && (
          <li className="text-sm text-gray-600">No class sessions yet.</li>
        )}
      </ul>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Type
          <select
            value={type}
            onChange={(event) => setType(event.target.value as ClassSessionType)}
            className="rounded border px-2 py-1.5"
          >
            <option value="lecture">Lecture</option>
            <option value="tutorial">Tutorial</option>
            <option value="lab">Lab</option>
            <option value="exam">Exam</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Day
          <select
            value={dayOfWeek}
            onChange={(event) => setDayOfWeek(event.target.value)}
            className="rounded border px-2 py-1.5"
          >
            {DAYS.map((day, index) => (
              <option key={day} value={index}>
                {day}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Start
          <input
            type="time"
            value={startTime}
            onChange={(event) => setStartTime(event.target.value)}
            className="rounded border px-2 py-1.5"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          End
          <input
            type="time"
            value={endTime}
            onChange={(event) => setEndTime(event.target.value)}
            className="rounded border px-2 py-1.5"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Location
          <input
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            className="rounded border px-2 py-1.5"
          />
        </label>
        <button type="submit" disabled={submitting} className="rounded border px-3 py-2 text-sm">
          {submitting ? "Saving…" : "Add session"}
        </button>
      </form>

      {error && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
