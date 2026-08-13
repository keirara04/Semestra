"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { CalendarBlock, DayCapacity, Semester } from "@/lib/types";
import { WeekStateMarker, weekState } from "@/components/WeekState";
import { pickCurrentSemester, weekNumberSince } from "@/lib/semester";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function startOfWeek(date: Date): Date {
  const day = date.getDay();
  const start = new Date(date);
  start.setDate(date.getDate() - day);
  start.setHours(0, 0, 0, 0);
  return start;
}

function toDateParam(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function formatHours(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins ? `${hours}h${mins}m` : `${hours}h`;
}

function isToday(dateString: string): boolean {
  return dateString === toDateParam(new Date());
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function weekLabel(semester: Semester, weekStart: Date): string {
  const week = weekNumberSince(semester.start_date, weekStart);
  if (week < 1) return `Before ${semester.name}`;
  if (week > weekNumberSince(semester.start_date, new Date(semester.end_date))) {
    return `After ${semester.name}`;
  }
  return `Week ${week} of ${semester.name}`;
}

// Suggested blocks get a dashed outline, committed (accepted/moved/done)
// blocks a solid one — the distinction between "the plan suggested this"
// and "you committed to this" is load-bearing for trust, per "Calendar
// view" in mdfile/DESIGN.md.
function blockStyle(status: CalendarBlock["status"]): string {
  if (status === "suggested") {
    return "border border-dashed border-[var(--fn-cobalt)] text-[var(--fn-cobalt)]";
  }
  if (status === "skipped") {
    return "border border-[var(--fn-rule)] text-[var(--fn-muted)] line-through";
  }
  return "border border-[var(--fn-cobalt)] bg-[var(--fn-cobalt)]/10 text-[var(--fn-cobalt)]";
}

// Calendar week grid — see "Calendar view" in mdfile/DESIGN.md.
export default function CalendarPage() {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [days, setDays] = useState<DayCapacity[] | null>(null);
  const [blocks, setBlocks] = useState<CalendarBlock[]>([]);
  const [semester, setSemester] = useState<Semester | null>(null);
  const [running, setRunning] = useState(false);

  function load() {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    apiFetch<DayCapacity[]>(
      `/api/calendar/capacity?from=${toDateParam(weekStart)}&to=${toDateParam(weekEnd)}`,
    ).then(setDays);
    apiFetch<CalendarBlock[]>("/api/calendar-blocks").then(setBlocks);
  }

  useEffect(load, [weekStart]);

  useEffect(() => {
    apiFetch<Semester[]>("/api/semesters").then((list) => setSemester(pickCurrentSemester(list)));
  }, []);

  function shiftWeek(delta: number) {
    setWeekStart((current) => {
      const next = new Date(current);
      next.setDate(current.getDate() + delta * 7);
      return next;
    });
  }

  async function runPlanner() {
    setRunning(true);
    try {
      await apiFetch("/api/planning/run", { method: "POST" });
      load();
    } finally {
      setRunning(false);
    }
  }

  async function updateStatus(block: CalendarBlock, status: CalendarBlock["status"]) {
    const updated = await apiFetch<CalendarBlock>(`/api/calendar-blocks/${block.id}`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    });
    setBlocks((current) => current.map((b) => (b.id === block.id ? updated : b)));
  }

  return (
    <main className="fn-sheet min-h-dvh w-full px-8 py-10 md:px-12">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="fn-eyebrow">Calendar</p>
          <h1 className="mt-1 text-2xl font-semibold">
            {semester ? weekLabel(semester, weekStart) : "Calendar"}
          </h1>
          <p className="fn-mono text-xs text-[var(--fn-muted)]">
            {weekStart.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
          </p>
        </div>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => shiftWeek(-1)}
            className="rounded-md border border-[var(--fn-rule)] px-3 py-1.5 text-sm hover:bg-[var(--fn-canvas)]"
          >
            ← Prev
          </button>
          <button
            type="button"
            onClick={() => shiftWeek(1)}
            className="rounded-md border border-[var(--fn-rule)] px-3 py-1.5 text-sm hover:bg-[var(--fn-canvas)]"
          >
            Next →
          </button>
          <button
            type="button"
            onClick={runPlanner}
            disabled={running}
            className="fn-btn-primary !w-fit px-3 py-1.5 text-sm"
          >
            {running ? "Planning…" : "Replan"}
          </button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-7">
        {days?.map((day) => {
          const dayBlocks = blocks.filter((b) => b.start_at.slice(0, 10) === day.date && b.status !== "skipped");
          const plannedMinutes = dayBlocks
            .filter((b) => b.status !== "suggested")
            .reduce((sum, b) => sum + (new Date(b.end_at).getTime() - new Date(b.start_at).getTime()) / 60_000, 0);
          const state = weekState(plannedMinutes, day.recommended_study_minutes);

          return (
            <div
              key={day.date}
              className={`flex flex-col gap-1.5 rounded-md border p-3 ${
                isToday(day.date) ? "border-[var(--fn-cobalt)]" : "border-[var(--fn-rule)]"
              }`}
            >
              <div className="flex items-baseline justify-between">
                <span className="fn-eyebrow">
                  {DAYS[day.day_of_week]} {day.date.slice(5)}
                </span>
                {!day.is_break && <WeekStateMarker state={state} />}
              </div>
              {day.is_break ? (
                <span className="fn-mono text-xs text-[var(--fn-muted)]">Break</span>
              ) : (
                <div className="fn-mono flex flex-col gap-1 text-xs text-[var(--fn-muted)]">
                  <span>Lectures {formatHours(day.lecture_minutes)}</span>
                  <span>Capacity {formatHours(day.recommended_study_minutes)}</span>
                </div>
              )}

              {dayBlocks.length > 0 && (
                <div className="mt-1 flex flex-col gap-1">
                  {dayBlocks.map((block) => (
                    <div
                      key={block.id}
                      className={`flex flex-col gap-0.5 rounded px-1.5 py-1 text-[11px] ${blockStyle(block.status)}`}
                    >
                      <span className="truncate font-medium">{block.title ?? "Study"}</span>
                      <span className="fn-mono">
                        {formatTime(block.start_at)}–{formatTime(block.end_at)}
                      </span>
                      {block.status === "suggested" && (
                        <div className="flex gap-2 pt-0.5">
                          <button
                            type="button"
                            onClick={() => updateStatus(block, "accepted")}
                            className="underline underline-offset-2"
                          >
                            Accept
                          </button>
                          <button
                            type="button"
                            onClick={() => updateStatus(block, "skipped")}
                            className="underline underline-offset-2"
                          >
                            Skip
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}
