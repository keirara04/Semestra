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
  return `${(minutes / 60).toFixed(1)}h`;
}

// Calendar week grid rendering the capacity readout — no CalendarBlock
// placement yet (that's Planning Engine); see "Timetable and availability"
// in the plan.
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
    <main className="mx-auto max-w-3xl px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Calendar</h1>
        <div className="flex gap-2 text-sm">
          <button type="button" onClick={() => shiftWeek(-1)} className="rounded border px-2 py-1">
            ← Prev
          </button>
          <button type="button" onClick={() => shiftWeek(1)} className="rounded border px-2 py-1">
            Next →
          </button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-7 gap-2">
        {days?.map((day) => (
          <div key={day.date} className="flex flex-col gap-1 rounded border p-2 text-xs">
            <div className="font-medium">
              {DAYS[day.day_of_week]} {day.date.slice(5)}
            </div>
            {day.is_break ? (
              <div className="text-gray-500">Break</div>
            ) : (
              <>
                <div className="text-gray-600">Lectures {formatHours(day.lecture_minutes)}</div>
                <div className="text-gray-600">
                  Commitments {formatHours(day.commitment_minutes)}
                </div>
                <div className="text-gray-600">Available {formatHours(day.available_minutes)}</div>
                <div className="font-medium">
                  Study capacity {formatHours(day.recommended_study_minutes)}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
