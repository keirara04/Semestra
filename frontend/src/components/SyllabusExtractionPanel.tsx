"use client";

import { useState } from "react";
import Link from "next/link";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { AssessmentCandidate, Material, SyllabusDraft, TaskCandidate } from "@/lib/types";

const ASSESSMENT_TYPES = ["report", "quiz", "lab", "project", "participation", "midterm", "final", "exam", "other"];

interface DraftAssessment extends AssessmentCandidate {
  selected: boolean;
}

interface DraftTask extends TaskCandidate {
  selected: boolean;
  assessmentIndex: number | null;
}

// AI Stage 1: syllabus extraction, see "AI capabilities by stage" in
// mdfile/AI.md. Every candidate starts as an editable, checked-off draft;
// nothing is written to Assessments/Tasks until confirm() runs, and only
// for candidates still selected at that point.
export function SyllabusExtractionPanel({ courseId, materials }: { courseId: number; materials: Material[] }) {
  const { user } = useAuth();
  const pdfMaterials = materials.filter((material) => material.type === "pdf");

  const [source, setSource] = useState<"paste" | "material">(pdfMaterials.length > 0 ? "material" : "paste");
  const [materialId, setMaterialId] = useState<number | "">(pdfMaterials[0]?.id ?? "");
  const [pastedText, setPastedText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [draft, setDraft] = useState<SyllabusDraft | null>(null);
  const [assessments, setAssessments] = useState<DraftAssessment[]>([]);
  const [tasks, setTasks] = useState<DraftTask[]>([]);
  const [confirming, setConfirming] = useState(false);
  const [confirmedCount, setConfirmedCount] = useState<number | null>(null);

  if (!user?.ai_syllabus_extraction_consent_at) {
    return (
      <div className="mt-8 border-t border-[var(--fn-rule)] pt-6">
        <p className="fn-eyebrow">Extract from syllabus</p>
        <p className="mt-2 text-sm text-[var(--fn-muted)]">
          Enable AI syllabus extraction in{" "}
          <Link href="/settings" className="text-[var(--fn-cobalt)] underline underline-offset-2">
            Settings
          </Link>{" "}
          to draft assessments and tasks from a pasted or uploaded syllabus.
        </p>
      </div>
    );
  }

  async function handleExtract() {
    setError(null);
    setSubmitting(true);
    try {
      const body = source === "material" ? { material_id: materialId } : { pasted_text: pastedText };
      const created = await apiFetch<SyllabusDraft>(`/api/courses/${courseId}/syllabus-drafts`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      setDraft(created);
      setAssessments(created.candidates.assessments.map((a) => ({ ...a, selected: true })));
      setTasks(created.candidates.tasks.map((t) => ({ ...t, selected: true, assessmentIndex: null })));
      setConfirmedCount(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Extraction failed.");
    } finally {
      setSubmitting(false);
    }
  }

  function updateAssessment(index: number, patch: Partial<DraftAssessment>) {
    setAssessments((current) => current.map((a, i) => (i === index ? { ...a, ...patch } : a)));
  }

  function updateTask(index: number, patch: Partial<DraftTask>) {
    setTasks((current) => current.map((t, i) => (i === index ? { ...t, ...patch } : t)));
  }

  async function handleConfirm() {
    if (!draft) return;
    setConfirming(true);
    setError(null);
    try {
      // Selected assessments are re-indexed 0..n: tasks reference that
      // new index, not their position in the original candidate list.
      const selectedAssessments = assessments.filter((a) => a.selected);
      const selectedAssessmentOriginalIndexes = assessments
        .map((a, i) => (a.selected ? i : null))
        .filter((i): i is number => i !== null);

      const remapAssessmentIndex = (originalIndex: number | null): number | null => {
        if (originalIndex === null) return null;
        const remapped = selectedAssessmentOriginalIndexes.indexOf(originalIndex);
        return remapped === -1 ? null : remapped;
      };

      await apiFetch(`/api/syllabus-drafts/${draft.id}/confirm`, {
        method: "POST",
        body: JSON.stringify({
          assessments: selectedAssessments.map((a) => ({ title: a.title, type: a.type, due_at: a.due_date })),
          tasks: tasks
            .filter((t) => t.selected)
            .map((t) => ({
              title: t.title,
              estimated_minutes: t.estimated_minutes,
              assessment_index: remapAssessmentIndex(t.assessmentIndex),
            })),
        }),
      });
      setConfirmedCount(selectedAssessments.length + tasks.filter((t) => t.selected).length);
      setDraft(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save the draft.");
    } finally {
      setConfirming(false);
    }
  }

  async function handleDiscard() {
    if (!draft) return;
    await apiFetch(`/api/syllabus-drafts/${draft.id}/discard`, { method: "POST" });
    setDraft(null);
  }

  return (
    <div className="mt-8 border-t border-[var(--fn-rule)] pt-6">
      <p className="fn-eyebrow">Extract from syllabus</p>

      {!draft && confirmedCount === null && (
        <div className="mt-3 flex flex-col gap-3">
          <p className="text-xs text-[var(--fn-muted)]">
            Works best on a document that actually lists graded work: a grading breakdown, an
            assignment schedule, exam dates. An intro/overview slide with no grading table won&apos;t
            produce anything, by design: the model never invents assessments that aren&apos;t stated.
          </p>

          {pdfMaterials.length > 0 && (
            <div className="flex gap-4 text-sm">
              <label className="flex items-center gap-1.5">
                <input
                  type="radio"
                  checked={source === "material"}
                  onChange={() => setSource("material")}
                />
                From an uploaded PDF
              </label>
              <label className="flex items-center gap-1.5">
                <input type="radio" checked={source === "paste"} onChange={() => setSource("paste")} />
                Paste text
              </label>
            </div>
          )}

          {source === "material" && pdfMaterials.length > 0 ? (
            <select
              value={materialId}
              onChange={(event) => setMaterialId(Number(event.target.value))}
              className="fn-input w-auto py-1.5"
            >
              {pdfMaterials.map((material) => (
                <option key={material.id} value={material.id}>
                  {material.title}
                </option>
              ))}
            </select>
          ) : (
            <textarea
              value={pastedText}
              onChange={(event) => setPastedText(event.target.value)}
              rows={6}
              placeholder="Paste the syllabus text here…"
              className="fn-input"
            />
          )}

          <button
            type="button"
            onClick={handleExtract}
            disabled={submitting || (source === "paste" && !pastedText.trim())}
            className="fn-btn-primary !w-fit px-4 py-1.5"
          >
            {submitting ? "Extracting…" : "Extract"}
          </button>
        </div>
      )}

      {confirmedCount !== null && (
        <p className="mt-3 text-sm text-[var(--fn-muted)]">
          Added {confirmedCount} item{confirmedCount === 1 ? "" : "s"}.{" "}
          <button
            type="button"
            onClick={() => setConfirmedCount(null)}
            className="text-[var(--fn-cobalt)] underline underline-offset-2"
          >
            Extract another
          </button>
        </p>
      )}

      {draft && (
        <div className="mt-4 flex flex-col gap-4">
          {assessments.length === 0 && tasks.length === 0 && (
            <p className="text-sm text-[var(--fn-muted)]">
              I couldn&apos;t find any clear assessment dates or tasks in this document. Try a
              document that includes a grading breakdown, assignment schedule, or exam dates,
              not an intro/overview page.
            </p>
          )}

          {assessments.length > 0 && (
            <div>
              <p className="fn-label">Deliverables</p>
              <ul className="mt-2 flex flex-col gap-3">
                {assessments.map((candidate, index) => (
                  <li key={index} className="flex flex-col gap-1.5 rounded-md border border-[var(--fn-rule)] p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="checkbox"
                        checked={candidate.selected}
                        onChange={(event) => updateAssessment(index, { selected: event.target.checked })}
                      />
                      <input
                        value={candidate.title}
                        onChange={(event) => updateAssessment(index, { title: event.target.value })}
                        className="fn-input w-auto flex-1 py-1"
                      />
                      <select
                        value={candidate.type}
                        onChange={(event) => updateAssessment(index, { type: event.target.value as AssessmentCandidate["type"] })}
                        className="fn-input w-auto py-1"
                      >
                        {ASSESSMENT_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                      <input
                        type="date"
                        value={candidate.due_date ?? ""}
                        onChange={(event) => updateAssessment(index, { due_date: event.target.value || null })}
                        className="fn-input w-auto py-1"
                      />
                      <span className="fn-mono text-[11px] text-[var(--fn-muted)]">{candidate.confidence}</span>
                    </div>
                    <p className="pl-6 text-xs italic text-[var(--fn-muted)]">&ldquo;{candidate.source_fragment}&rdquo;</p>
                    {!candidate.due_date && (
                      <p className="pl-6 text-xs text-[var(--fn-oxide)]">No date found. Add one before confirming.</p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {tasks.length > 0 && (
            <div>
              <p className="fn-label">Tasks</p>
              <ul className="mt-2 flex flex-col gap-3">
                {tasks.map((candidate, index) => (
                  <li key={index} className="flex flex-col gap-1.5 rounded-md border border-[var(--fn-rule)] p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="checkbox"
                        checked={candidate.selected}
                        onChange={(event) => updateTask(index, { selected: event.target.checked })}
                      />
                      <input
                        value={candidate.title}
                        onChange={(event) => updateTask(index, { title: event.target.value })}
                        className="fn-input w-auto flex-1 py-1"
                      />
                      <input
                        type="number"
                        min={0}
                        value={candidate.estimated_minutes ?? ""}
                        onChange={(event) =>
                          updateTask(index, { estimated_minutes: event.target.value ? Number(event.target.value) : null })
                        }
                        className="fn-input w-24 py-1"
                        placeholder="minutes"
                      />
                      {assessments.length > 0 && (
                        <select
                          value={candidate.assessmentIndex ?? ""}
                          onChange={(event) =>
                            updateTask(index, {
                              assessmentIndex: event.target.value === "" ? null : Number(event.target.value),
                            })
                          }
                          className="fn-input w-auto py-1"
                        >
                          <option value="">No linked assessment</option>
                          {assessments.map((a, i) => (
                            <option key={i} value={i}>
                              {a.title}
                            </option>
                          ))}
                        </select>
                      )}
                      <span className="fn-mono text-[11px] text-[var(--fn-muted)]">{candidate.confidence}</span>
                    </div>
                    <p className="pl-6 text-xs italic text-[var(--fn-muted)]">&ldquo;{candidate.source_fragment}&rdquo;</p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleConfirm}
              disabled={confirming}
              className="fn-btn-primary !w-fit px-4 py-1.5"
            >
              {confirming ? "Saving…" : "Confirm selected"}
            </button>
            <button
              type="button"
              onClick={handleDiscard}
              className="text-sm text-[var(--fn-muted)] underline underline-offset-2"
            >
              Discard
            </button>
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-2 text-sm text-[var(--fn-oxide)]">
          {error}
        </p>
      )}
    </div>
  );
}
