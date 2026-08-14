"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { CalendarBlock, DayCapacity, Semester } from "@/lib/types";
import { WeekStateMarker, weekState } from "@/components/WeekState";
import { pickCurrentSemester } from "@/lib/semester";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function startOfWeek(date: Date): Date {
  const day = date.getDay();
  const start = new Date(date);
  start.setDate(date.getDate() - day);
  start.setHours(0, 0, 0, 0);
  return start;
}

function startOfMonth(date: Date): Date {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  start.setHours(0, 0, 0, 0);
  return start;
}

function endOfMonth(date: Date): Date {
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  end.setHours(0, 0, 0, 0);
  return end;
}

function addDays(date: Date, amount: number): Date {
  const next = new Date(date);
  next.setDate(date.getDate() + amount);
  return next;
}

// Grid always covers full weeks (Sun–Sat) so the month renders as a clean rectangle.
function monthGridDays(monthAnchor: Date): Date[] {
  const gridStart = startOfWeek(startOfMonth(monthAnchor));
  const gridEnd = startOfWeek(endOfMonth(monthAnchor));
  const days: Date[] = [];
  for (let d = gridStart; d <= addDays(gridEnd, 6); d = addDays(d, 1)) {
    days.push(d);
  }
  return days;
}

function toDateParam(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function isToday(dateString: string): boolean {
  return dateString === toDateParam(new Date());
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function monthLabel(monthAnchor: Date): string {
  return monthAnchor.toLocaleDateString(undefined, { month: "long", year: "numeric" });
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

// Calendar month grid — see "Calendar view" in mdfile/DESIGN.md.
export default function CalendarPage() {
  const [monthAnchor, setMonthAnchor] = useState(() => startOfMonth(new Date()));
  const [days, setDays] = useState<DayCapacity[] | null>(null);
  const [blocks, setBlocks] = useState<CalendarBlock[]>([]);
  const [semester, setSemester] = useState<Semester | null>(null);
  const [running, setRunning] = useState(false);

  const gridDays = monthGridDays(monthAnchor);

  function load() {
    const gridStart = gridDays[0];
    const gridEnd = gridDays[gridDays.length - 1];

    apiFetch<DayCapacity[]>(
      `/api/calendar/capacity?from=${toDateParam(gridStart)}&to=${toDateParam(gridEnd)}`,
    ).then(setDays);
    apiFetch<CalendarBlock[]>("/api/calendar-blocks").then(setBlocks);
  }

  useEffect(load, [monthAnchor]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    apiFetch<Semester[]>("/api/semesters").then((list) => setSemester(pickCurrentSemester(list)));
  }, []);

  function shiftMonth(delta: number) {
    setMonthAnchor((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));
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
    <main className="bg-[var(--fn-paper)] min-h-dvh w-full px-8 py-10 md:px-12">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="fn-eyebrow">{semester?.name ?? "Calendar"}</p>
          <h1 className="mt-1 text-2xl font-semibold">{monthLabel(monthAnchor)}</h1>
        </div>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            className="rounded-md border border-[var(--fn-rule)] px-3 py-1.5 text-sm hover:bg-[var(--fn-canvas)]"
          >
            ← Prev
          </button>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
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

      <div className="mt-6 grid grid-cols-7 gap-px overflow-hidden rounded-md border border-[var(--fn-rule)] bg-[var(--fn-rule)]">
        {DAYS.map((label) => (
          <div key={label} className="fn-eyebrow bg-[var(--fn-canvas)] px-2 py-1.5 text-center">
            {label}
          </div>
        ))}
        {gridDays.map((cellDate) => {
          const dateParam = toDateParam(cellDate);
          const day = days?.find((d) => d.date === dateParam);
          const inMonth = cellDate.getMonth() === monthAnchor.getMonth();
          const dayBlocks = blocks.filter((b) => b.start_at.slice(0, 10) === dateParam && b.status !== "skipped");
          const plannedMinutes = dayBlocks
            .filter((b) => b.status !== "suggested")
            .reduce((sum, b) => sum + (new Date(b.end_at).getTime() - new Date(b.start_at).getTime()) / 60_000, 0);
          const state = day ? weekState(plannedMinutes, day.recommended_study_minutes) : null;

          return (
            <div
              key={dateParam}
              className={`flex min-h-28 flex-col gap-1 bg-[var(--fn-paper)] p-2 ${
                inMonth ? "" : "opacity-40"
              } ${isToday(dateParam) ? "ring-1 ring-inset ring-[var(--fn-cobalt)]" : ""}`}
            >
              <div className="flex items-baseline justify-between">
                <span className="fn-mono text-xs text-[var(--fn-muted)]">{cellDate.getDate()}</span>
                {day && !day.is_break && state && <WeekStateMarker state={state} />}
              </div>
              {day?.is_break && <span className="fn-mono text-[11px] text-[var(--fn-muted)]">Break</span>}

              {dayBlocks.length > 0 && (
                <div className="flex flex-col gap-1">
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
