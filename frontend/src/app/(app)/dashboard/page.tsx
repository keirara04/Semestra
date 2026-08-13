"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import type { Today } from "@/lib/types";

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

// Today dashboard — Foundation Phase 5. Per "Today dashboard" in the plan,
// this shows manually-entered/upcoming data only: there is no ranking
// engine yet (Planning Engine release), so the task list is plain
// due-date order, not a real priority score — the copy says so rather
// than pretend this is finished.
export default function DashboardPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [today, setToday] = useState<Today | null>(null);

  useEffect(() => {
    apiFetch<Today>("/api/today").then(setToday);
  }, []);

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  if (!today) return null;

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold break-words">
            {greeting()}, {user?.name}
          </h1>
          <p className="text-sm text-gray-600">
            {new Date(today.date).toLocaleDateString(undefined, {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="shrink-0 rounded border px-3 py-1.5 text-sm"
        >
          Log out
        </button>
      </div>

      {today.classes_today.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-medium text-gray-600">Today&apos;s classes</h2>
          <ul className="mt-2 flex flex-col gap-1.5">
            {today.classes_today.map((session) => (
              <li key={session.id} className="flex items-center gap-2 text-sm">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: session.course_colour }}
                />
                {session.course_title} · {session.start_time.slice(0, 5)}–
                {session.end_time.slice(0, 5)}
                {session.location && ` · ${session.location}`}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-medium text-gray-600">Today&apos;s focus</h2>
          {today.ranking_is_basic && (
            <span className="text-xs text-gray-400">sorted by due date — real ranking coming soon</span>
          )}
        </div>
        <ul className="mt-2 flex flex-col gap-1.5">
          {today.tasks.map((task) => (
            <li key={task.id} className="flex items-center gap-2 text-sm">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: task.course_colour }}
              />
              <span>{task.title}</span>
              {task.remaining_estimate_minutes != null && (
                <span className="text-gray-500">{formatMinutes(task.remaining_estimate_minutes)}</span>
              )}
            </li>
          ))}
          {today.tasks.length === 0 && <li className="text-sm text-gray-600">Nothing open.</li>}
        </ul>
      </div>

      <div className="mt-6">
        <h2 className="text-sm font-medium text-gray-600">Upcoming</h2>
        <ul className="mt-2 flex flex-col gap-1.5">
          {today.assessments_due_soon.map((assessment) => (
            <li key={assessment.id} className="flex items-center gap-2 text-sm">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: assessment.course_colour }}
              />
              {assessment.title} — due{" "}
              {new Date(assessment.due_at).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })}
            </li>
          ))}
          {today.assessments_due_soon.length === 0 && (
            <li className="text-sm text-gray-600">Nothing due in the next two weeks.</li>
          )}
        </ul>
      </div>

      <div className="mt-6 text-sm text-gray-600">
        Workload: {formatMinutes(today.planned_minutes_today)} planned ·{" "}
        {formatMinutes(today.capacity.recommended_study_minutes)} study capacity available
      </div>
    </main>
  );
}
