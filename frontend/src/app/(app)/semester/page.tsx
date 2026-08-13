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
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-xl font-semibold">Semester</h1>

      <ul className="mt-6 flex flex-col gap-2">
        {semesters?.map((semester) => (
          <li key={semester.id} className="rounded border px-3 py-2 text-sm">
            <span className="font-medium">{semester.name}</span>{" "}
            <span className="text-gray-600">
              {semester.start_date} – {semester.end_date}
            </span>
          </li>
        ))}
        {semesters?.length === 0 && (
          <li className="text-sm text-gray-600">No semesters yet — add one below.</li>
        )}
      </ul>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Name
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            className="rounded border px-3 py-2"
            placeholder="Fall 2026"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Start date
          <input
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            required
            className="rounded border px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          End date
          <input
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
            required
            className="rounded border px-3 py-2"
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
          {submitting ? "Saving…" : "Add semester"}
        </button>
      </form>
    </main>
  );
}
