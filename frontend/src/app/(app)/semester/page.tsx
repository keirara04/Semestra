"use client";

import { useEffect, useState, type FormEvent } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import type { Semester } from "@/lib/types";

// Semester setup — Foundation Phase 1. One student typically has one active
// semester at a time; this lists all and lets them create/edit.
export default function SemesterPage() {
  const [semesters, setSemesters] = useState<Semester[] | null>(null);
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiFetch<Semester[]>("/api/semesters").then(setSemesters);
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const created = await apiFetch<Semester>("/api/semesters", {
        method: "POST",
        body: JSON.stringify({ name, start_date: startDate, end_date: endDate }),
      });
      setSemesters((current) => [...(current ?? []), created]);
      setName("");
      setStartDate("");
      setEndDate("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="fn-sheet mx-auto min-h-dvh max-w-2xl px-6 py-10 md:my-6 md:rounded-2xl md:shadow-sm">
      <p className="fn-eyebrow">Semester</p>
      <h1 className="mt-1 text-2xl font-semibold">Terms</h1>

      <ul className="mt-6 flex flex-col divide-y divide-[var(--fn-rule)]">
        {semesters?.map((semester) => (
          <li key={semester.id} className="flex items-baseline justify-between py-2.5 text-sm">
            <span className="font-medium">{semester.name}</span>
            <span className="fn-mono text-[var(--fn-muted)]">
              {semester.start_date} – {semester.end_date}
            </span>
          </li>
        ))}
        {semesters?.length === 0 && (
          <li className="py-2.5 text-sm text-[var(--fn-muted)]">No semesters yet — add one below.</li>
        )}
      </ul>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="fn-label">Name</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            className="fn-input"
            placeholder="Fall 2026"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="fn-label">Start date</span>
          <input
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            required
            className="fn-input"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="fn-label">End date</span>
          <input
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
            required
            className="fn-input"
          />
        </label>

        {error && (
          <p role="alert" className="text-sm text-[var(--fn-oxide)]">
            {error}
          </p>
        )}

        <button type="submit" disabled={submitting} className="fn-btn-primary !w-fit px-4">
          {submitting ? "Saving…" : "Add semester"}
        </button>
      </form>
    </main>
  );
}
