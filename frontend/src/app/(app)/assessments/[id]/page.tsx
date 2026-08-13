"use client";

import { use, useEffect, useState, type FormEvent } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import type { Assessment, AssessmentStatus, Milestone } from "@/lib/types";

const STATUSES: AssessmentStatus[] = ["not_started", "in_progress", "blocked", "done"];

function formatMinutes(minutes: number | null | undefined): string {
  if (!minutes) return "0m";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return [hours ? `${hours}h` : null, mins ? `${mins}m` : null].filter(Boolean).join(" ");
}

// Assessment detail — see "Assessment and project planner" in
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
    <main className="fn-sheet mx-auto min-h-dvh max-w-2xl px-6 py-10 md:my-6 md:rounded-2xl md:shadow-sm">
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
              checked={milestone.done}
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
