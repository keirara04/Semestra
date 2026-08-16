"use client";

import { useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import type { ParsedTimetableSubject, TimetableImport } from "@/lib/types";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DEFAULT_COLOUR = "#2857A0";

interface DayMeeting {
  day: number;
  location: string | null;
}

// A class that meets on more than one day at the same time (the common
// case — most Everytime subjects are twice a week) collapses into one
// review row with a day-toggle strip, instead of one row per meeting the
// student would otherwise have to review individually N times. Grouped by
// title+professor+time, since that's what actually identifies "the same
// class" across its meetings; per-meeting location is kept but edited as
// a single field applied to every day in the group — a class meeting in
// two different rooms on two different days is rare enough that
// surfacing per-day location editing isn't worth the extra UI here.
//
// No course picker: the import *is* the course list — every group always
// creates/matches a course by title (backend find-or-creates case
// insensitively per semester, so re-importing the same link never makes
// duplicate courses).
interface DraftGroup {
  title: string;
  professor: string | null;
  startTime: string;
  endTime: string;
  meetings: DayMeeting[];
}

function groupKey(subject: ParsedTimetableSubject): string {
  return `${subject.title}|${subject.professor ?? ""}|${subject.start_time}|${subject.end_time}`;
}

function groupSubjects(subjects: ParsedTimetableSubject[]): DraftGroup[] {
  const groups = new Map<string, DraftGroup>();

  for (const subject of subjects) {
    const key = groupKey(subject);
    const existing = groups.get(key);
    const meeting: DayMeeting = { day: subject.day_of_week, location: subject.location };

    if (existing) {
      existing.meetings.push(meeting);
    } else {
      groups.set(key, {
        title: subject.title,
        professor: subject.professor,
        startTime: subject.start_time,
        endTime: subject.end_time,
        meetings: [meeting],
      });
    }
  }

  return Array.from(groups.values()).map((group) => ({
    ...group,
    meetings: group.meetings.sort((a, b) => a.day - b.day),
  }));
}

// Everytime (에브리타임) share-link import, modeled on
// SyllabusExtractionPanel's draft-then-confirm shape: paste a link, review
// the parsed weekly pattern as editable rows, nothing is created until
// Confirm. Rendered as a popup (unlike the inline syllabus panel) since
// it's launched from the Dashboard timetable widget rather than embedded
// in a page.
export function EverytimeImportPanel({
  semesterId,
  onClose,
  onImported,
}: {
  semesterId: number;
  onClose: () => void;
  onImported: () => void;
}) {
  const [url, setUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [draft, setDraft] = useState<TimetableImport | null>(null);
  const [groups, setGroups] = useState<DraftGroup[]>([]);
  const [confirming, setConfirming] = useState(false);

  async function handleFetch() {
    setError(null);
    setSubmitting(true);
    try {
      const created = await apiFetch<TimetableImport>("/api/timetable-imports", {
        method: "POST",
        body: JSON.stringify({ semester_id: semesterId, url }),
      });
      setDraft(created);
      setGroups(groupSubjects(created.payload));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't read that link.");
    } finally {
      setSubmitting(false);
    }
  }

  function updateGroup(index: number, patch: Partial<DraftGroup>) {
    setGroups((current) => current.map((group, i) => (i === index ? { ...group, ...patch } : group)));
  }

  function toggleDay(index: number, day: number) {
    setGroups((current) =>
      current.map((group, i) => {
        if (i !== index) return group;
        const has = group.meetings.some((meeting) => meeting.day === day);
        const meetings = has
          ? group.meetings.filter((meeting) => meeting.day !== day)
          : [...group.meetings, { day, location: group.meetings[0]?.location ?? null }].sort(
              (a, b) => a.day - b.day,
            );
        return { ...group, meetings };
      }),
    );
  }

  function updateLocation(index: number, location: string | null) {
    setGroups((current) =>
      current.map((group, i) =>
        i === index ? { ...group, meetings: group.meetings.map((meeting) => ({ ...meeting, location })) } : group,
      ),
    );
  }

  async function handleConfirm() {
    if (!draft) return;
    setConfirming(true);
    setError(null);
    try {
      await apiFetch(`/api/timetable-imports/${draft.id}/confirm`, {
        method: "POST",
        body: JSON.stringify({
          subjects: groups.flatMap((group) =>
            group.meetings.map((meeting) => ({
              title: group.title,
              day_of_week: meeting.day,
              start_time: group.startTime,
              end_time: group.endTime,
              location: meeting.location,
              course_id: null,
              new_course: { title: group.title, colour: DEFAULT_COLOUR },
            })),
          ),
        }),
      });
      onImported();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save the import.");
    } finally {
      setConfirming(false);
    }
  }

  async function handleDiscard() {
    if (draft) {
      await apiFetch(`/api/timetable-imports/${draft.id}/discard`, { method: "POST" });
    }
    onClose();
  }

  return (
    <div
      className="fn-popup-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Import from Everytime"
        className="fn-popup-card max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border border-[var(--fn-rule)] bg-[var(--fn-paper)] p-6 shadow-xl"
      >
        <div className="flex items-center justify-between">
          <p className="fn-eyebrow">Import from Everytime</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="fn-mono text-lg leading-none text-[var(--fn-muted)] hover:text-[var(--fn-ink)]"
          >
            ×
          </button>
        </div>

        {!draft && (
          <div className="mt-4 flex flex-col gap-3">
            <p className="text-xs text-[var(--fn-muted)]">
              Paste your Everytime public timetable share link (everytime.kr/@…). Nothing is imported
              until you review and confirm below.
            </p>
            <input
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://everytime.kr/@…"
              className="fn-input"
            />
            <button
              type="button"
              onClick={handleFetch}
              disabled={submitting || !url.trim()}
              className="fn-btn-primary !w-fit px-4 py-1.5"
            >
              {submitting ? "Reading…" : "Fetch"}
            </button>
          </div>
        )}

        {draft && (
          <div className="mt-4 flex flex-col gap-4">
            {groups.length === 0 ? (
              <p className="text-sm text-[var(--fn-muted)]">No classes found on that link.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {groups.map((group, index) => (
                  <li key={index} className="flex flex-col gap-2 rounded-md border border-[var(--fn-rule)] p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        value={group.title}
                        onChange={(event) => updateGroup(index, { title: event.target.value })}
                        className="fn-input w-auto flex-1 py-1"
                      />
                      <input
                        type="time"
                        value={group.startTime}
                        onChange={(event) => updateGroup(index, { startTime: event.target.value })}
                        className="fn-input w-auto py-1"
                      />
                      <input
                        type="time"
                        value={group.endTime}
                        onChange={(event) => updateGroup(index, { endTime: event.target.value })}
                        className="fn-input w-auto py-1"
                      />
                      <input
                        value={group.meetings[0]?.location ?? ""}
                        onChange={(event) => updateLocation(index, event.target.value || null)}
                        placeholder="Location"
                        className="fn-input w-auto py-1"
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-1 pl-1">
                      <span className="fn-label mr-1">Days</span>
                      {DAY_LABELS.map((label, day) => {
                        const active = group.meetings.some((meeting) => meeting.day === day);
                        return (
                          <button
                            key={label}
                            type="button"
                            onClick={() => toggleDay(index, day)}
                            aria-pressed={active}
                            className={`fn-mono rounded-full px-2 py-0.5 text-[11px] ${
                              active
                                ? "bg-[var(--fn-cobalt)] text-white"
                                : "border border-[var(--fn-rule)] text-[var(--fn-muted)]"
                            }`}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleConfirm}
                disabled={confirming || groups.every((group) => group.meetings.length === 0)}
                className="fn-btn-primary !w-fit px-4 py-1.5"
              >
                {confirming ? "Saving…" : "Confirm"}
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
    </div>
  );
}
