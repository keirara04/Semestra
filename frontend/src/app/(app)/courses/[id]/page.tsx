"use client";

import { useEffect, useState, type FormEvent } from "react";
import { use } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import type { ClassSession, ClassSessionType, Course, GradeItem, GradeReport } from "@/lib/types";

const TABS = ["Overview", "Assessments", "Materials", "Revision", "Grades", "Insights"] as const;

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

type CourseWithSessions = Course & { class_sessions: ClassSession[] };

// Course workspace — see "Course workspace" and "Primary navigation" (Courses
// row) in mdfile/DESIGN.md. Only Overview is functional this phase; the
// rest are Foundation-release placeholders until later releases land.
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
    <main className="fn-sheet mx-auto min-h-dvh max-w-2xl px-6 py-10 md:my-6 md:rounded-2xl md:shadow-sm">
      <div className="flex items-center gap-3">
        <span
          className="h-9 w-1.5 shrink-0 rounded-full"
          style={{ backgroundColor: course.colour }}
          aria-hidden
        />
        <div>
          <p className="fn-eyebrow">Course</p>
          <h1 className="text-2xl font-semibold">{course.title}</h1>
        </div>
      </div>
      <p className="fn-mono mt-2 text-sm text-[var(--fn-muted)]">
        {[course.instructor, course.credits ? `${course.credits} credits` : null, course.grade_target]
          .filter(Boolean)
          .join(" · ") || "No details yet"}
      </p>

      <nav className="mt-6 flex gap-1 overflow-x-auto border-b border-[var(--fn-rule)] text-sm">
        {TABS.map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => setTab(name)}
            className={`-mb-px shrink-0 border-b-2 px-3 py-2 transition-colors ${
              tab === name
                ? "border-[var(--fn-cobalt)] font-medium text-[var(--fn-ink)]"
                : "border-transparent text-[var(--fn-muted)] hover:text-[var(--fn-ink)]"
            }`}
          >
            {name}
          </button>
        ))}
      </nav>

      {tab === "Overview" && (
        <Overview
          course={course}
          onSessionCreated={(session) =>
            setCourse((current) =>
              current ? { ...current, class_sessions: [...current.class_sessions, session] } : current,
            )
          }
        />
      )}
      {tab === "Grades" && <Grades courseId={course.id} />}
      {tab !== "Overview" && tab !== "Grades" && (
        <p className="mt-6 text-sm text-[var(--fn-muted)]">
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
      <p className="fn-eyebrow">Weekly schedule</p>
      <ul className="mt-3 flex flex-col divide-y divide-[var(--fn-rule)]">
        {course.class_sessions.map((session) => (
          <li key={session.id} className="fn-mono py-2 text-sm">
            {DAYS[session.day_of_week]} · {session.start_time.slice(0, 5)}–
            {session.end_time.slice(0, 5)} · {session.type}
            {session.location && ` · ${session.location}`}
          </li>
        ))}
        {course.class_sessions.length === 0 && (
          <li className="py-2 text-sm text-[var(--fn-muted)]">No class sessions yet.</li>
        )}
      </ul>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="fn-label">Type</span>
          <select
            value={type}
            onChange={(event) => setType(event.target.value as ClassSessionType)}
            className="fn-input w-auto py-1.5"
          >
            <option value="lecture">Lecture</option>
            <option value="tutorial">Tutorial</option>
            <option value="lab">Lab</option>
            <option value="exam">Exam</option>
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="fn-label">Day</span>
          <select
            value={dayOfWeek}
            onChange={(event) => setDayOfWeek(event.target.value)}
            className="fn-input w-auto py-1.5"
          >
            {DAYS.map((day, index) => (
              <option key={day} value={index}>
                {day}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="fn-label">Start</span>
          <input
            type="time"
            value={startTime}
            onChange={(event) => setStartTime(event.target.value)}
            className="fn-input w-auto py-1.5"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="fn-label">End</span>
          <input
            type="time"
            value={endTime}
            onChange={(event) => setEndTime(event.target.value)}
            className="fn-input w-auto py-1.5"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="fn-label">Location</span>
          <input
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            className="fn-input w-auto py-1.5"
          />
        </label>
        <button type="submit" disabled={submitting} className="fn-btn-primary !w-fit px-4 py-1.5">
          {submitting ? "Saving…" : "Add session"}
        </button>
      </form>

      {error && (
        <p role="alert" className="mt-2 text-sm text-[var(--fn-oxide)]">
          {error}
        </p>
      )}
    </div>
  );
}

function formatPercent(value: number | null): string {
  return value === null ? "—" : `${value.toFixed(1)}%`;
}

// Grade tracker — see "Grade tracker" in mdfile/DESIGN.md. Current
// standing is always paired with its "(of completed weight only)"
// qualifier; pending weight gets its own visible chip rather than a
// silent gap, per the same section's false-precision failure mode.
function Grades({ courseId }: { courseId: number }) {
  const [report, setReport] = useState<GradeReport | null>(null);
  const [items, setItems] = useState<GradeItem[]>([]);
  const [name, setName] = useState("");
  const [weighting, setWeighting] = useState("");
  const [maxScore, setMaxScore] = useState("100");
  const [achievedScore, setAchievedScore] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function refresh() {
    const [reportData, itemsData] = await Promise.all([
      apiFetch<GradeReport>(`/api/courses/${courseId}/grades`),
      apiFetch<GradeItem[]>("/api/grade-items"),
    ]);
    setReport(reportData);
    setItems(itemsData.filter((item) => item.course_id === courseId));
  }

  useEffect(() => {
    Promise.all([
      apiFetch<GradeReport>(`/api/courses/${courseId}/grades`),
      apiFetch<GradeItem[]>("/api/grade-items"),
    ]).then(([reportData, itemsData]) => {
      setReport(reportData);
      setItems(itemsData.filter((item) => item.course_id === courseId));
    });
  }, [courseId]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiFetch<GradeItem>("/api/grade-items", {
        method: "POST",
        body: JSON.stringify({
          course_id: courseId,
          name,
          weighting: Number(weighting),
          max_score: Number(maxScore),
          achieved_score: achievedScore === "" ? null : Number(achievedScore),
        }),
      });
      setName("");
      setWeighting("");
      setAchievedScore("");
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!report) return null;

  const mostlyUngraded = report.ungraded_weight_percent >= 50;

  return (
    <div className="mt-6">
      <p className="fn-eyebrow">Current standing</p>
      <p className="fn-mono text-4xl font-semibold">{formatPercent(report.current_standing)}</p>
      <p className="text-xs text-[var(--fn-muted)]">(of completed weight only)</p>

      {report.ungraded_weight_percent > 0 && (
        <span className="fn-mono mt-3 inline-block rounded border border-[var(--fn-rule)] px-2 py-1 text-[11px] text-[var(--fn-muted)]">
          {report.ungraded_weight_percent.toFixed(0)}% ungraded
        </span>
      )}

      {mostlyUngraded ? (
        <p className="mt-4 text-sm text-[var(--fn-muted)]">
          Projected grade: unavailable — {report.ungraded_weight_percent.toFixed(0)}% of the grade
          has no expected score yet.
        </p>
      ) : (
        <div className="mt-4 grid grid-cols-3 gap-3 border-t border-[var(--fn-rule)] pt-4">
          <div>
            <p className="fn-mono text-lg font-semibold">{formatPercent(report.best_case)}</p>
            <p className="fn-mono text-[11px] text-[var(--fn-muted)]">assumes 100%</p>
          </div>
          <div>
            <p className="fn-mono text-lg font-semibold">{formatPercent(report.expected)}</p>
            <p className="fn-mono text-[11px] text-[var(--fn-muted)]">assumes target</p>
          </div>
          <div>
            <p className="fn-mono text-lg font-semibold">{formatPercent(report.conservative)}</p>
            <p className="fn-mono text-[11px] text-[var(--fn-muted)]">assumes your average</p>
          </div>
        </div>
      )}

      {report.needed_average !== null && (
        <p className="mt-4 text-sm">
          Need ~{report.needed_average.toFixed(1)}% average across remaining work to reach your
          target.
        </p>
      )}

      {report.pass_hurdles.length > 0 && (
        <div className="mt-4 flex flex-col gap-1">
          {report.pass_hurdles.map((hurdle) => (
            <p key={hurdle.item_name} className="fn-mono text-xs text-[var(--fn-muted)]">
              {hurdle.item_name}: needs {hurdle.required_percent}% —{" "}
              {hurdle.achieved_percent === null
                ? "pending"
                : hurdle.passed
                  ? "passed"
                  : "not met"}
            </p>
          ))}
        </div>
      )}

      <p className="fn-eyebrow mt-8">Grade items</p>
      <ul className="mt-3 flex flex-col divide-y divide-[var(--fn-rule)]">
        {items.map((item) => (
          <li key={item.id} className="flex items-center justify-between py-2 text-sm">
            <span>{item.name}</span>
            <span className="fn-mono text-[var(--fn-muted)]">
              {item.weighting}% ·{" "}
              {item.achieved_score === null ? "ungraded" : `${item.achieved_score}/${item.max_score}`}
            </span>
          </li>
        ))}
        {items.length === 0 && (
          <li className="py-2 text-sm text-[var(--fn-muted)]">No grade items yet.</li>
        )}
      </ul>

      <form onSubmit={handleSubmit} className="mt-4 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="fn-label">Name</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            className="fn-input w-auto py-1.5"
            placeholder="Midterm"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="fn-label">Weight %</span>
          <input
            type="number"
            min={0}
            max={100}
            value={weighting}
            onChange={(event) => setWeighting(event.target.value)}
            required
            className="fn-input w-24 py-1.5"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="fn-label">Max score</span>
          <input
            type="number"
            min={0}
            value={maxScore}
            onChange={(event) => setMaxScore(event.target.value)}
            required
            className="fn-input w-24 py-1.5"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="fn-label">Achieved (optional)</span>
          <input
            type="number"
            min={0}
            value={achievedScore}
            onChange={(event) => setAchievedScore(event.target.value)}
            className="fn-input w-24 py-1.5"
          />
        </label>
        <button type="submit" disabled={submitting} className="fn-btn-primary !w-fit px-4 py-1.5">
          {submitting ? "Saving…" : "Add item"}
        </button>
      </form>

      {error && (
        <p role="alert" className="mt-2 text-sm text-[var(--fn-oxide)]">
          {error}
        </p>
      )}
    </div>
  );
}
