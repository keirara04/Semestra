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

// Assessment detail — see "Assessment and project planner" in the plan.
// Recommended/latest-safe-start dates aren't shown here: those come from
// the planner's feasibility pass (Planning Engine, not this release).
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
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-xl font-semibold">{assessment.title}</h1>
      <p className="mt-1 text-sm text-gray-600">
        {assessment.type} · due {new Date(assessment.due_at).toLocaleString()}
      </p>

      <div className="mt-4 flex items-center gap-3 text-sm">
        <span className="text-gray-600">Status</span>
        <select
          value={assessment.status}
          onChange={(event) => updateStatus(event.target.value as AssessmentStatus)}
          className="rounded border px-2 py-1.5"
        >
          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {status.replace("_", " ")}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4 flex gap-6 text-sm">
        <div>
          <div className="text-gray-600">Estimated effort</div>
          <div className="font-medium">{formatMinutes(assessment.estimated_minutes)}</div>
        </div>
        <div>
          <div className="text-gray-600">Remaining effort</div>
          <div className="font-medium">{formatMinutes(assessment.remaining_minutes)}</div>
        </div>
      </div>

      {assessment.group_members && assessment.group_members.length > 0 && (
        <p className="mt-4 text-sm text-gray-600">
          Group: {assessment.group_members.join(", ")}
        </p>
      )}

      {assessment.notes && <p className="mt-4 text-sm text-gray-600">{assessment.notes}</p>}

      <MilestonesSection
        assessmentId={assessment.id}
        milestones={assessment.milestones ?? []}
        onChange={(milestones) => setAssessment((current) => (current ? { ...current, milestones } : current))}
      />

      {error && (
        <p role="alert" className="mt-4 text-sm text-red-600">
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
      <h2 className="text-sm font-medium">Milestones</h2>
      <ul className="mt-3 flex flex-col gap-2">
        {milestones.map((milestone) => (
          <li key={milestone.id} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={milestone.done}
              onChange={() => toggleDone(milestone)}
            />
            <span className={milestone.done ? "text-gray-400 line-through" : ""}>
              {milestone.title}
            </span>
            {milestone.estimate_minutes && (
              <span className="text-gray-500">{formatMinutes(milestone.estimate_minutes)}</span>
            )}
          </li>
        ))}
        {milestones.length === 0 && (
          <li className="text-sm text-gray-600">No milestones yet.</li>
        )}
      </ul>

      <form onSubmit={addMilestone} className="mt-3 flex gap-2">
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          required
          className="flex-1 rounded border px-3 py-1.5 text-sm"
          placeholder="Draft methodology"
        />
        <button type="submit" disabled={submitting} className="rounded border px-3 py-1.5 text-sm">
          Add
        </button>
      </form>
    </div>
  );
}
