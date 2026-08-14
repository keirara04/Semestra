"use client";

import { useEffect, useState, type FormEvent } from "react";
import { use } from "react";
import Link from "next/link";
import { apiFetch, ApiError } from "@/lib/api";
import type {
  ClassSession,
  ClassSessionType,
  Course,
  GradeItem,
  GradeReport,
  Material,
  MaterialType,
  Topic,
} from "@/lib/types";
import { ConfidenceBar, type Confidence } from "@/components/Confidence";
import { SyllabusExtractionPanel } from "@/components/SyllabusExtractionPanel";

const TABS = ["Overview", "Assessments", "Materials", "Revision", "Grades", "Insights"] as const;

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

type CourseWithSessions = Course & { class_sessions: ClassSession[] };

// Course workspace, see "Course workspace" and "Primary navigation" (Courses
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
    <main className="bg-[var(--fn-paper)] min-h-dvh w-full px-8 py-10 md:px-12">
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
      {tab === "Materials" && <Materials courseId={course.id} />}
      {tab === "Revision" && <Revision courseId={course.id} />}
      {tab !== "Overview" && tab !== "Grades" && tab !== "Materials" && tab !== "Revision" && (
        <p className="mt-6 text-sm text-[var(--fn-muted)]">
          {tab} isn&apos;t built yet. This ships in a later release.
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
  return value === null ? "N/A" : `${value.toFixed(1)}%`;
}

// Grade tracker, see "Grade tracker" in mdfile/DESIGN.md. Current
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
          Projected grade unavailable: {report.ungraded_weight_percent.toFixed(0)}% of the grade
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
              {hurdle.item_name}: needs {hurdle.required_percent}%,{" "}
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

const MATERIAL_TYPE_LABEL: Record<MaterialType, string> = {
  slide: "Slide",
  pdf: "PDF",
  reading: "Reading",
  recording: "Recording",
  link: "Link",
};

// Materials, see "Materials, notes, and revision" in
// mdfile/semester-command-center.md and "Materials list" in DESIGN.md: a
// plain filterable list, not a card grid.
function Materials({ courseId }: { courseId: number }) {
  const [materials, setMaterials] = useState<Material[] | null>(null);
  const [type, setType] = useState<MaterialType>("slide");
  const [title, setTitle] = useState("");
  const [week, setWeek] = useState("");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiFetch<Material[]>("/api/materials").then((list) =>
      setMaterials(list.filter((item) => item.course_id === courseId)),
    );
  }, [courseId]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.set("course_id", String(courseId));
      formData.set("type", type);
      formData.set("title", title);
      if (week) formData.set("week", week);
      if (type === "link" || url) formData.set("url", url);
      if (file) formData.set("file", file);

      const created = await apiFetch<Material>("/api/materials", {
        method: "POST",
        body: formData,
      });
      setMaterials((current) => [...(current ?? []), created]);
      setTitle("");
      setWeek("");
      setUrl("");
      setFile(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(material: Material) {
    await apiFetch(`/api/materials/${material.id}`, { method: "DELETE" });
    setMaterials((current) => current?.filter((item) => item.id !== material.id) ?? null);
  }

  return (
    <div className="mt-6">
      <p className="fn-eyebrow">Materials</p>
      <ul className="mt-3 flex flex-col divide-y divide-[var(--fn-rule)]">
        {materials?.map((material) => (
          <li key={material.id} className="flex items-center gap-3 py-2 text-sm">
            <span className="fn-mono w-20 shrink-0 text-[11px] text-[var(--fn-muted)]">
              {MATERIAL_TYPE_LABEL[material.type]}
            </span>
            <a
              href={material.url ?? material.file_url ?? undefined}
              target="_blank"
              rel="noreferrer"
              className="min-w-0 flex-1 truncate text-[var(--fn-cobalt)] underline underline-offset-2"
            >
              {material.title}
            </a>
            {material.week && (
              <span className="fn-mono shrink-0 text-[11px] text-[var(--fn-muted)]">
                Week {material.week}
              </span>
            )}
            {material.type === "pdf" && (
              <Link
                href={`/notestra/${material.id}`}
                className="shrink-0 text-[11px] text-[var(--fn-cobalt)] underline underline-offset-2"
              >
                Open in Notestra
              </Link>
            )}
            <button
              type="button"
              onClick={() => handleDelete(material)}
              className="shrink-0 text-[11px] text-[var(--fn-oxide)] underline underline-offset-2"
            >
              Remove
            </button>
          </li>
        ))}
        {materials?.length === 0 && (
          <li className="py-2 text-sm text-[var(--fn-muted)]">No materials yet.</li>
        )}
      </ul>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="fn-label">Type</span>
          <select
            value={type}
            onChange={(event) => setType(event.target.value as MaterialType)}
            className="fn-input w-auto py-1.5"
          >
            {Object.entries(MATERIAL_TYPE_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
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
            className="fn-input w-auto py-1.5"
            placeholder="Week 3 slides"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="fn-label">Week (optional)</span>
          <input
            type="number"
            min={1}
            max={52}
            value={week}
            onChange={(event) => setWeek(event.target.value)}
            className="fn-input w-20 py-1.5"
          />
        </label>
        {type === "link" ? (
          <label className="flex flex-col gap-1.5">
            <span className="fn-label">URL</span>
            <input
              type="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              required
              className="fn-input w-auto py-1.5"
              placeholder="https://…"
            />
          </label>
        ) : (
          <label className="flex flex-col gap-1.5">
            <span className="fn-label">File</span>
            <input
              type="file"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              className="text-sm"
            />
          </label>
        )}
        <button type="submit" disabled={submitting} className="fn-btn-primary !w-fit px-4 py-1.5">
          {submitting ? "Uploading…" : "Add material"}
        </button>
      </form>

      {error && (
        <p role="alert" className="mt-2 text-sm text-[var(--fn-oxide)]">
          {error}
        </p>
      )}

      <SyllabusExtractionPanel courseId={courseId} materials={materials ?? []} />
    </div>
  );
}

const CONFIDENCE_OPTIONS: Confidence[] = ["not_started", "learning", "comfortable", "confident"];

// Revision, see "Materials, notes, and revision" in
// mdfile/semester-command-center.md: topics use the same confidence
// vocabulary the spaced revision engine (Phase C) and Exam mode (Phase D)
// both read from.
function Revision({ courseId }: { courseId: number }) {
  const [topics, setTopics] = useState<Topic[] | null>(null);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiFetch<Topic[]>("/api/topics").then((list) =>
      setTopics(list.filter((topic) => topic.course_id === courseId)),
    );
  }, [courseId]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const created = await apiFetch<Topic>("/api/topics", {
        method: "POST",
        body: JSON.stringify({ course_id: courseId, title }),
      });
      setTopics((current) => [...(current ?? []), created]);
      setTitle("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  async function updateConfidence(topic: Topic, confidence: Confidence) {
    const updated = await apiFetch<Topic>(`/api/topics/${topic.id}`, {
      method: "PUT",
      body: JSON.stringify({ confidence }),
    });
    setTopics((current) => current?.map((item) => (item.id === topic.id ? updated : item)) ?? null);
  }

  return (
    <div className="mt-6">
      <p className="fn-eyebrow">Topics</p>
      <ul className="mt-3 flex flex-col divide-y divide-[var(--fn-rule)]">
        {topics?.map((topic) => (
          <li key={topic.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
            <span className="min-w-0 flex-1 truncate">{topic.title}</span>
            {topic.next_review_at && (
              <span className="fn-mono shrink-0 text-[11px] text-[var(--fn-muted)]">
                Next review {new Date(topic.next_review_at).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            )}
            <ConfidenceBar confidence={topic.confidence} />
            <select
              value={topic.confidence}
              onChange={(event) => updateConfidence(topic, event.target.value as Confidence)}
              className="fn-input w-auto py-1 text-xs"
              aria-label={`Confidence for ${topic.title}`}
            >
              {CONFIDENCE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option.replace("_", " ")}
                </option>
              ))}
            </select>
          </li>
        ))}
        {topics?.length === 0 && (
          <li className="py-2.5 text-sm text-[var(--fn-muted)]">No topics yet.</li>
        )}
      </ul>

      <form onSubmit={handleSubmit} className="mt-6 flex items-end gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="fn-label">New topic</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
            className="fn-input w-auto py-1.5"
            placeholder="Backpropagation"
          />
        </label>
        <button type="submit" disabled={submitting} className="fn-btn-primary !w-fit px-4 py-1.5">
          {submitting ? "Saving…" : "Add topic"}
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
