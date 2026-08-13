"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import type { Today } from "@/lib/types";
import { WEEK_STATE_LABEL, WeekStateMarker, weekState } from "@/components/WeekState";

function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return [hours ? `${hours}h` : null, mins ? `${mins}m` : null].filter(Boolean).join(" ") || "0m";
}

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function dayEyebrow(date: Date): string {
  const day = date.toLocaleDateString(undefined, { weekday: "short" }).toUpperCase();
  const rest = date.toLocaleDateString(undefined, { day: "numeric", month: "short" }).toUpperCase();
  return `${day} · ${rest}`;
}

function daysUntil(dueAt: string): string {
  const days = Math.ceil((new Date(dueAt).getTime() - Date.now()) / 86_400_000);
  if (days <= 0) return "due today";
  if (days === 1) return "due tomorrow";
  return `due in ${days}d`;
}

// Today dashboard — see "Today dashboard" in mdfile/DESIGN.md. The focus
// list is the real "Smart study planner" ranking (Planning Engine) — each
// row's reason is collapsed by default and expands on tap, per DESIGN.md's
// planner-reason disclosure pattern.
export default function DashboardPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [today, setToday] = useState<Today | null>(null);
  const [expandedTaskId, setExpandedTaskId] = useState<number | null>(null);

  useEffect(() => {
    apiFetch<Today>("/api/today").then(setToday);
  }, []);

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  if (!today) return null;

  const date = new Date(`${today.date}T00:00:00`);
  const nextClass = today.classes_today[0];
  const state = weekState(today.planned_minutes_today, today.capacity.recommended_study_minutes);
  const visibleTasks = today.tasks.slice(0, 5);
  const overflowCount = today.tasks.length - visibleTasks.length;

  return (
    <main className="fn-sheet mx-auto min-h-dvh max-w-2xl px-6 py-10 md:my-6 md:rounded-2xl md:shadow-sm">
      {/* Greeting strip */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="fn-eyebrow">{dayEyebrow(date)}</p>
          <h1 className="mt-1 text-2xl font-semibold break-words">
            {greeting()}, {user?.name}
          </h1>
          {nextClass ? (
            <p className="fn-mono mt-1 text-sm text-[var(--fn-muted)]">
              Next: {nextClass.course_title} {nextClass.type} · {nextClass.start_time.slice(0, 5)}–
              {nextClass.end_time.slice(0, 5)}
            </p>
          ) : (
            <p className="mt-1 text-sm text-[var(--fn-muted)]">No classes today</p>
          )}
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="shrink-0 rounded-md border border-[var(--fn-rule)] px-3 py-1.5 text-sm text-[var(--fn-ink)] hover:bg-[var(--fn-canvas)]"
        >
          Log out
        </button>
      </div>

      {/* Today's focus */}
      <section className="mt-8">
        <p className="fn-eyebrow">Today&apos;s focus</p>

        {visibleTasks.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--fn-muted)]">
            Nothing urgent — next planned work is your upcoming deadlines below.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col divide-y divide-[var(--fn-rule)]">
            {visibleTasks.map((task) => {
              const expanded = expandedTaskId === task.id;
              return (
                <li key={task.id} className="py-2.5">
                  <button
                    type="button"
                    onClick={() => setExpandedTaskId(expanded ? null : task.id)}
                    className="flex w-full items-center gap-3 text-left text-sm"
                  >
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: task.course_colour }}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1 truncate">{task.title}</span>
                    <span className="fn-mono shrink-0 text-[var(--fn-muted)]">{task.course_title}</span>
                    {task.remaining_estimate_minutes != null && (
                      <span className="fn-mono shrink-0 text-[var(--fn-muted)]">
                        {formatMinutes(task.remaining_estimate_minutes)}
                      </span>
                    )}
                    {task.due_at && (
                      <span className="fn-mono shrink-0 text-[var(--fn-muted)]">{daysUntil(task.due_at)}</span>
                    )}
                  </button>
                  {expanded && (
                    <div className="fn-mono mt-1.5 ml-5.5 text-xs text-[var(--fn-muted)]">
                      Suggested because:
                      <ul className="mt-1 list-inside list-disc">
                        {task.reasons.map((reason) => (
                          <li key={reason}>{reason}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {overflowCount > 0 && (
          <p className="fn-mono mt-2 text-[11px] text-[var(--fn-muted)]">+{overflowCount} more</p>
        )}
      </section>

      {/* Upcoming strip */}
      <section className="mt-8">
        <p className="fn-eyebrow">Upcoming</p>
        {today.assessments_due_soon.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--fn-muted)]">Nothing due in the next two weeks.</p>
        ) : (
          <ul className="mt-3 flex gap-4 overflow-x-auto pb-1">
            {today.assessments_due_soon.map((assessment) => (
              <li
                key={assessment.id}
                className="flex shrink-0 flex-col gap-1 rounded-md border border-[var(--fn-rule)] px-3 py-2"
              >
                <span className="flex items-center gap-2 text-sm">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: assessment.course_colour }}
                    aria-hidden
                  />
                  {assessment.title}
                </span>
                <span className="fn-mono text-[11px] text-[var(--fn-muted)]">
                  {daysUntil(assessment.due_at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Workload verdict */}
      <section className="mt-8 flex items-center gap-2 border-t border-[var(--fn-rule)] pt-4 text-sm">
        <span className="text-[var(--fn-muted)]">Workload:</span>
        <span className="font-medium">{WEEK_STATE_LABEL[state]}</span>
        <WeekStateMarker state={state} />
        <span className="fn-mono text-[var(--fn-muted)]">
          · {formatMinutes(today.planned_minutes_today)} planned ·{" "}
          {formatMinutes(today.capacity.recommended_study_minutes)} capacity
        </span>
      </section>
    </main>
  );
}
