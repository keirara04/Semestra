"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { DayCapacity } from "@/lib/types";

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

// Calendar week grid — see "Calendar view" in mdfile/DESIGN.md. Term-long
// semester map is coarse; this is the day/week zoom level. No CalendarBlock
// placement for lecture/commitment yet (that stays capacity-engine-derived
// until Planning Engine); the per-day readout is the engine's output made
// visible, per spec.
export default function CalendarPage() {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [days, setDays] = useState<DayCapacity[] | null>(null);

  useEffect(() => {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    apiFetch<DayCapacity[]>(
      `/api/calendar/capacity?from=${toDateParam(weekStart)}&to=${toDateParam(weekEnd)}`,
    ).then(setDays);
  }, [weekStart]);

  function shiftWeek(delta: number) {
    setWeekStart((current) => {
      const next = new Date(current);
      next.setDate(current.getDate() + delta * 7);
      return next;
    });
  }

  return (
    <main className="fn-sheet mx-auto min-h-dvh max-w-4xl px-6 py-10 md:my-6 md:rounded-2xl md:shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="fn-eyebrow">Calendar</p>
          <h1 className="mt-1 text-2xl font-semibold">
            Week of {weekStart.toLocaleDateString(undefined, { month: "long", day: "numeric" })}
          </h1>
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
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-7">
        {days?.map((day) => (
          <div
            key={day.date}
            className={`flex flex-col gap-1.5 rounded-md border p-3 ${
              isToday(day.date) ? "border-[var(--fn-cobalt)]" : "border-[var(--fn-rule)]"
            }`}
          >
            <span className="fn-eyebrow">
              {DAYS[day.day_of_week]} {day.date.slice(5)}
            </span>
            {day.is_break ? (
              <span className="fn-mono text-xs text-[var(--fn-muted)]">Break</span>
            ) : (
              <div className="fn-mono flex flex-col gap-1 text-xs text-[var(--fn-muted)]">
                <span>Lectures {formatHours(day.lecture_minutes)}</span>
                <span>Commitments {formatHours(day.commitment_minutes)}</span>
                <span>Available {formatHours(day.available_minutes)}</span>
                <span className="font-medium text-[var(--fn-ink)]">
                  Capacity {formatHours(day.recommended_study_minutes)}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      <p className="mt-4 text-xs text-[var(--fn-muted)]">
        No planned-study workload verdict yet — that reads off the planner&apos;s allocation
        output (Planning Engine, not this release).
      </p>
    </main>
  );
}
