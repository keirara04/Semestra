"use client";

import { use, useEffect, useState, type FormEvent } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import type { Assessment, AssessmentStatus, ExamReadiness, Milestone, Topic } from "@/lib/types";
import { formatMinutes } from "@/lib/format";
import { ConfidenceBar } from "@/components/Confidence";

const STATUSES: AssessmentStatus[] = ["not_started", "in_progress", "blocked", "done"];

// Assessment detail, see "Assessment and project planner" in
// mdfile/semester-command-center.md. Recommended/latest-safe-start dates
// aren't shown here: those come from the planner's feasibility pass
// (Planning Engine, not this release).
export default function AssessmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<Assessment>(`/api/assessments/${id}`).then(setAssessment);
  }, [id]);

  if (!assessment) return null;

  async function updateStatus(status: AssessmentStatus) {
    try {
      const updated = await apiFetch<Assessment>(`/api/assessments/${id}`, {
        method: "PUT",
        body: JSON.stringify({ status }),
      });
      setAssessment((current) => (current ? { ...current, status: updated.status } : current));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    }
  }

  return (
    <main className="bg-[var(--fn-paper)] min-h-dvh w-full px-8 py-10 md:px-12">
      <p className="fn-eyebrow">{assessment.type}</p>
      <h1 className="mt-1 text-2xl font-semibold">{assessment.title}</h1>
      <p className="fn-mono mt-1 text-sm text-[var(--fn-muted)]">
        Due {new Date(assessment.due_at).toLocaleString()}
      </p>

      <div className="mt-4 flex items-center gap-3 text-sm">
        <span className="fn-label">Status</span>
        <select
          value={assessment.status}
          onChange={(event) => updateStatus(event.target.value as AssessmentStatus)}
          className="fn-input w-auto py-1.5"
        >
          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {status.replace("_", " ")}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-6 flex gap-8 border-t border-[var(--fn-rule)] pt-4">
        <div>
          <p className="fn-label">Estimated effort</p>
          <p className="fn-mono text-xl font-semibold">{formatMinutes(assessment.estimated_minutes)}</p>
        </div>
        <div>
          <p className="fn-label">Remaining effort</p>
          <p className="fn-mono text-xl font-semibold">{formatMinutes(assessment.remaining_minutes)}</p>
        </div>
      </div>

      {assessment.group_members && assessment.group_members.length > 0 && (
        <p className="fn-mono mt-4 inline-block rounded border border-[var(--fn-rule)] px-2 py-1 text-[11px] text-[var(--fn-muted)]">
          with {assessment.group_members.join(", ")}
        </p>
      )}

      {assessment.notes && (
        <p className="mt-4 text-sm text-[var(--fn-muted)]">{assessment.notes}</p>
      )}

      <MilestonesSection
        assessmentId={assessment.id}
        milestones={assessment.milestones ?? []}
        onChange={(milestones) => setAssessment((current) => (current ? { ...current, milestones } : current))}
      />

      {assessment.type === "exam" && (
        <ExamMode assessmentId={assessment.id} courseId={assessment.course_id} />
      )}

      {error && (
        <p role="alert" className="mt-4 text-sm text-[var(--fn-oxide)]">
          {error}
        </p>
      )}
    </main>
  );
}

function MilestonesSection({
  assessmentId,
  milestones,
  onChange,
}: {
  assessmentId: number;
  milestones: Milestone[];
  onChange: (milestones: Milestone[]) => void;
}) {
  const [title, setTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function addMilestone(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const created = await apiFetch<Milestone>("/api/milestones", {
        method: "POST",
        body: JSON.stringify({
          assessment_id: assessmentId,
          title,
          order: milestones.length,
        }),
      });
      onChange([...milestones, created]);
      setTitle("");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleDone(milestone: Milestone) {
    const updated = await apiFetch<Milestone>(`/api/milestones/${milestone.id}`, {
      method: "PUT",
      body: JSON.stringify({ done: !milestone.done }),
    });
    onChange(milestones.map((item) => (item.id === milestone.id ? updated : item)));
  }

  return (
    <div className="mt-8">
      <p className="fn-eyebrow">Milestones</p>
      <ul className="mt-3 flex flex-col divide-y divide-[var(--fn-rule)]">
        {milestones.map((milestone) => (
          <li key={milestone.id} className="flex items-center gap-3 py-2 text-sm">
            <input
              type="checkbox"
              checked={!!milestone.done}
              onChange={() => toggleDone(milestone)}
              className="h-4 w-4 accent-[var(--fn-cobalt)]"
            />
            <span
              className={
                milestone.done
                  ? "flex-1 text-[var(--fn-muted)] line-through"
                  : "flex-1 text-[var(--fn-ink)]"
              }
            >
              {milestone.title}
            </span>
            {milestone.estimate_minutes && (
              <span className="fn-mono text-[var(--fn-muted)]">
                {formatMinutes(milestone.estimate_minutes)}
              </span>
            )}
          </li>
        ))}
        {milestones.length === 0 && (
          <li className="py-2 text-sm text-[var(--fn-muted)]">No milestones yet.</li>
        )}
      </ul>

      <form onSubmit={addMilestone} className="mt-3 flex gap-2">
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          required
          className="fn-input flex-1"
          placeholder="Draft methodology"
        />
        <button type="submit" disabled={submitting} className="fn-btn-primary !w-fit px-4">
          Add
        </button>
      </form>
    </div>
  );
}

function formatReadiness(percent: number | null): string {
  return percent === null ? "N/A" : `${Math.round(percent)}%`;
}

// Exam mode, see "Exam mode" in mdfile/semester-command-center.md.
// Readiness is the one large number on screen, always with its
// constituent topics available on expand (which ones are dragging it
// down), never an unexplained number.
function ExamMode({ assessmentId, courseId }: { assessmentId: number; courseId: number }) {
  const [readiness, setReadiness] = useState<ExamReadiness | null>(null);
  const [courseTopics, setCourseTopics] = useState<Topic[]>([]);

  function load() {
    apiFetch<ExamReadiness>(`/api/assessments/${assessmentId}/readiness`).then(setReadiness);
    apiFetch<Topic[]>("/api/topics").then((list) =>
      setCourseTopics(list.filter((topic) => topic.course_id === courseId)),
    );
  }

  useEffect(load, [assessmentId, courseId]);

  async function toggleLinked(topic: Topic) {
    const currentIds = topic.assessments?.map((a) => a.id) ?? [];
    const linked = currentIds.includes(assessmentId);
    const nextIds = linked
      ? currentIds.filter((id) => id !== assessmentId)
      : [...currentIds, assessmentId];

    await apiFetch(`/api/topics/${topic.id}`, {
      method: "PUT",
      body: JSON.stringify({ assessment_ids: nextIds }),
    });
    load();
  }

  if (!readiness) return null;

  const linkedTopicIds = new Set(readiness.topics.map((t) => t.id));

  return (
    <div className="mt-8 border-t border-[var(--fn-rule)] pt-6">
      <p className="fn-eyebrow">Exam mode</p>

      <div className="mt-3 flex items-baseline gap-3">
        <span className="fn-mono text-4xl font-semibold">{formatReadiness(readiness.readiness_percent)}</span>
        <span className="text-sm text-[var(--fn-muted)]">readiness</span>
        {readiness.days_remaining >= 0 && (
          <span className="fn-mono text-xs text-[var(--fn-muted)]">
            {readiness.days_remaining} day{readiness.days_remaining === 1 ? "" : "s"} remaining
          </span>
        )}
      </div>

      {readiness.suggested_pace_minutes_per_day !== null && (
        <p className="mt-2 text-sm text-[var(--fn-muted)]">
          Suggested pace: {formatMinutes(Math.round(readiness.suggested_pace_minutes_per_day))}/day
        </p>
      )}

      <p className="fn-eyebrow mt-6">Coverage</p>
      <ul className="mt-3 flex flex-col divide-y divide-[var(--fn-rule)]">
        {courseTopics
          .filter((topic) => linkedTopicIds.has(topic.id))
          .map((topic) => (
            <li key={topic.id} className="flex items-center justify-between gap-3 py-2 text-sm">
              <span className="min-w-0 flex-1 truncate">{topic.title}</span>
              <ConfidenceBar confidence={topic.confidence} />
              <button
                type="button"
                onClick={() => toggleLinked(topic)}
                className="shrink-0 text-[11px] text-[var(--fn-oxide)] underline underline-offset-2"
              >
                Remove
              </button>
            </li>
          ))}
        {readiness.topics.length === 0 && (
          <li className="py-2 text-sm text-[var(--fn-muted)]">
            No topics linked yet. Add some below.
          </li>
        )}
      </ul>

      {courseTopics.some((topic) => !linkedTopicIds.has(topic.id)) && (
        <div className="mt-4">
          <p className="fn-label">Add coverage</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {courseTopics
              .filter((topic) => !linkedTopicIds.has(topic.id))
              .map((topic) => (
                <button
                  key={topic.id}
                  type="button"
                  onClick={() => toggleLinked(topic)}
                  className="rounded-full border border-[var(--fn-rule)] px-3 py-1 text-xs hover:bg-[var(--fn-canvas)]"
                >
                  + {topic.title}
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
