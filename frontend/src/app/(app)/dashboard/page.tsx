"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, X } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import type { CalendarBlock, DayCapacity, Semester, Today, WeeklyReview } from "@/lib/types";
import { WEEK_STATE_LABEL, weekState, type WeekState } from "@/components/WeekState";
import { useNotifications } from "@/lib/notifications";
import { pickCurrentSemester, weekNumberSince } from "@/lib/semester";
import { daysUntil, formatMinutes } from "@/lib/format";

const REVIEW_DISMISSED_KEY = "semestra:review-dismissed-id";
const DAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];

// Sage/ochre/oxide mirror the week-state palette used everywhere else
// (Calendar, Semester map) so "busy" reads the same colour app-wide.
const STATE_RING_COLOUR: Record<WeekState, string> = {
  comfortable: "var(--fn-sage)",
  busy: "var(--fn-ochre)",
  at_risk: "var(--fn-oxide)",
  critical: "var(--fn-oxide)",
};

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

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

// The one signature moment on this page: today's date, stamped like a
// library due-date stamp — the closest thing to the app's paper-planner
// vernacular that's specific to a university student's day. Animates in
// once on mount (see .fn-stamp in globals.css); reduced-motion just
// shows it already rotated, no fade/scale.
function DateStamp({ date }: { date: Date }) {
  const weekday = date.toLocaleDateString(undefined, { weekday: "short" }).toUpperCase();
  const day = date.getDate();
  const month = date.toLocaleDateString(undefined, { month: "short" }).toUpperCase();

  return (
    <div className="fn-stamp fn-mono flex shrink-0 flex-col items-center justify-center gap-0.5 rounded border-2 border-[var(--fn-oxide)] px-3 py-1.5 text-[var(--fn-oxide)]">
      <span className="text-[10px] font-semibold tracking-widest">{weekday}</span>
      <span className="text-lg leading-none font-bold">{day}</span>
      <span className="text-[10px] font-semibold tracking-widest">{month}</span>
    </div>
  );
}

// Canvas/Blackboard-style coloured course tag — the actual per-course
// colour a student already assigned their class, worn as a real label
// instead of a thin decorative bar.
function CourseTag({ label, colour }: { label: string; colour: string }) {
  return (
    <span
      className="fn-mono inline-block w-fit max-w-full truncate rounded-sm border px-1.5 py-0.5 text-[10px] font-semibold tracking-wide"
      style={{
        borderColor: colour,
        color: colour,
        backgroundColor: `color-mix(in srgb, ${colour} 16%, transparent)`,
      }}
    >
      {label}
    </span>
  );
}

function WorkloadRing({ percent, ringPercent, colour }: { percent: number; ringPercent: number; colour: string }) {
  const size = 88;
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - ringPercent / 100);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${percent}% of today's capacity planned`}>
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--fn-rule)" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={colour}
        strokeWidth={stroke}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" fontSize="18" fontWeight="700" fill="var(--fn-ink)">
        {percent}%
      </text>
    </svg>
  );
}

// Today dashboard, see "Today dashboard" in mdfile/DESIGN.md. The focus
// list is the real "Smart study planner" ranking (Planning Engine); each
// row's reason is collapsed by default and expands on tap, per DESIGN.md's
// planner-reason disclosure pattern. Restyled as a ledger page: ruled
// rows, a course-colour tab per row, and an "at a glance" rail alongside
// it rather than the workload verdict buried at the bottom of the page.
export default function DashboardPage() {
  const { user } = useAuth();
  const [today, setToday] = useState<Today | null>(null);
  const [expandedTaskId, setExpandedTaskId] = useState<number | null>(null);
  const [pendingReview, setPendingReview] = useState<WeeklyReview | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [semester, setSemester] = useState<Semester | null>(null);
  const [weekDays, setWeekDays] = useState<DayCapacity[]>([]);
  const [weekBlocks, setWeekBlocks] = useState<CalendarBlock[]>([]);
  const { notifications, unreadCount, markRead } = useNotifications();

  useEffect(() => {
    apiFetch<Today>("/api/today").then(setToday);
    apiFetch<WeeklyReview | null>("/api/weekly-reviews/latest").then((review) => {
      const dismissedId = window.localStorage.getItem(REVIEW_DISMISSED_KEY);
      if (review && String(review.id) !== dismissedId) {
        setPendingReview(review);
      }
    });
    apiFetch<Semester[]>("/api/semesters").then((list) => setSemester(pickCurrentSemester(list)));

    const weekStart = startOfWeek(new Date());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    apiFetch<DayCapacity[]>(
      `/api/calendar/capacity?from=${toDateParam(weekStart)}&to=${toDateParam(weekEnd)}`,
    ).then(setWeekDays);
    apiFetch<CalendarBlock[]>("/api/calendar-blocks").then(setWeekBlocks);
  }, []);

  if (!today) return null;

  const date = new Date(`${today.date}T00:00:00`);
  const nextClass = today.classes_today[0];
  const state = weekState(today.planned_minutes_today, today.capacity.recommended_study_minutes);
  const rawPercent =
    today.capacity.recommended_study_minutes > 0
      ? Math.round((today.planned_minutes_today / today.capacity.recommended_study_minutes) * 100)
      : 0;
  const visibleTasks = today.tasks.slice(0, 5);
  const overflowCount = today.tasks.length - visibleTasks.length;
  const nextDue = today.assessments_due_soon[0];
  const weekLabel = semester
    ? `${semester.name} · Week ${weekNumberSince(semester.start_date, startOfWeek(date))}`
    : null;

  return (
    <main className="bg-[var(--fn-paper)] min-h-dvh w-full px-6 py-8 md:px-12 md:py-10">
      {pendingReview && (
        <Link
          href="/review"
          className="fn-mono mb-6 flex items-center justify-between rounded-md border border-[var(--fn-rule)] bg-[var(--fn-canvas)] px-4 py-2.5 text-sm text-[var(--fn-ink)]"
        >
          Your weekly review is ready
          <span className="text-[var(--fn-muted)]">View →</span>
        </Link>
      )}

      {/* Header — stamped date, greeting, notifications */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <DateStamp date={date} />
          <div className="min-w-0">
            {weekLabel && <p className="fn-eyebrow">{weekLabel}</p>}
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
        </div>
        <button
          type="button"
          onClick={() => setNotificationsOpen(true)}
          aria-label={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : "Notifications"}
          className="relative shrink-0 rounded-md border border-[var(--fn-rule)] p-2 text-[var(--fn-muted)] hover:text-[var(--fn-ink)]"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-[var(--fn-ochre)]" />
          )}
        </button>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_280px]">
        <div className="min-w-0">
          {/* Today's board — pinned index cards, corkboard */}
          <section>
            <p className="fn-eyebrow">Today&apos;s board</p>

            {visibleTasks.length === 0 ? (
              <p className="mt-3 text-sm text-[var(--fn-muted)]">
                Nothing urgent. Next planned work is your upcoming deadlines below.
              </p>
            ) : (
              <div className="fn-cork mt-3 rounded-md p-4">
                <div className="flex flex-wrap items-start gap-x-5 gap-y-6">
                  {visibleTasks.map((task, index) => {
                    const expanded = expandedTaskId === task.id;
                    const tilt = expanded ? 0 : index % 2 === 0 ? -1.5 : 1.5;
                    return (
                      <div
                        key={task.id}
                        className="relative w-44 shrink-0"
                        style={{ transform: `rotate(${tilt}deg)`, transition: "transform 150ms ease" }}
                      >
                        <span
                          className="absolute top-0 left-1/2 z-10 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[var(--fn-paper)] shadow-sm"
                          style={{ backgroundColor: task.course_colour }}
                          aria-hidden
                        />
                        <button
                          type="button"
                          onClick={() => setExpandedTaskId(expanded ? null : task.id)}
                          className="block w-full rounded-sm p-3 text-left shadow-md"
                          style={{
                            backgroundColor: `color-mix(in srgb, ${task.course_colour} 10%, var(--fn-paper))`,
                            borderTop: `3px solid ${task.course_colour}`,
                          }}
                        >
                          <CourseTag label={task.course_title} colour={task.course_colour} />
                          <p className="mt-2 text-sm leading-snug font-medium">{task.title}</p>
                          <div className="fn-mono mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-[var(--fn-muted)]">
                            {task.remaining_estimate_minutes != null && (
                              <span>{formatMinutes(task.remaining_estimate_minutes)}</span>
                            )}
                            {task.due_at && <span>{daysUntil(task.due_at)}</span>}
                          </div>
                          {expanded && (
                            <div className="fn-mono mt-2 border-t border-black/10 pt-2 text-[11px] text-[var(--fn-muted)]">
                              Suggested because:
                              <ul className="mt-1 list-inside list-disc">
                                {task.reasons.map((reason) => (
                                  <li key={reason}>{reason}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {overflowCount > 0 && (
              <p className="fn-mono mt-2 text-[11px] text-[var(--fn-muted)]">+{overflowCount} more</p>
            )}
          </section>

          {/* Upcoming — index cards */}
          <section className="mt-8">
            <p className="fn-eyebrow">Upcoming</p>
            {today.assessments_due_soon.length === 0 ? (
              <p className="mt-3 text-sm text-[var(--fn-muted)]">Nothing due in the next two weeks.</p>
            ) : (
              <ul className="mt-3 flex gap-3 overflow-x-auto pb-1">
                {today.assessments_due_soon.map((assessment) => (
                  <li
                    key={assessment.id}
                    className="flex shrink-0 flex-col gap-1 rounded-md p-3"
                    style={{
                      backgroundColor: `color-mix(in srgb, ${assessment.course_colour} 10%, var(--fn-paper))`,
                      borderTop: `3px solid ${assessment.course_colour}`,
                    }}
                  >
                    <CourseTag label={assessment.course_title} colour={assessment.course_colour} />
                    <span className="mt-1 text-sm">{assessment.title}</span>
                    <span className="fn-mono text-[11px] text-[var(--fn-muted)]">{daysUntil(assessment.due_at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* At a glance rail */}
        <aside className="flex flex-col gap-4">
          <div className="flex flex-col items-center gap-2 rounded-md border border-[var(--fn-rule)] p-4">
            <p className="fn-eyebrow self-start">Workload</p>
            <WorkloadRing percent={rawPercent} ringPercent={Math.min(100, rawPercent)} colour={STATE_RING_COLOUR[state]} />
            <p className="text-sm font-medium">{WEEK_STATE_LABEL[state]}</p>
            <p className="fn-mono text-center text-xs text-[var(--fn-muted)]">
              {formatMinutes(today.planned_minutes_today)} planned ·{" "}
              {formatMinutes(today.capacity.recommended_study_minutes)} capacity
            </p>
          </div>

          {nextDue && (
            <Link
              href="/assessments"
              className="block rounded-md p-4 hover:brightness-95"
              style={{
                backgroundColor: `color-mix(in srgb, ${nextDue.course_colour} 10%, var(--fn-paper))`,
                borderTop: `3px solid ${nextDue.course_colour}`,
              }}
            >
              <p className="fn-eyebrow">Next due</p>
              <p className="mt-1 truncate text-sm font-medium">{nextDue.title}</p>
              <div className="mt-1.5">
                <CourseTag label={nextDue.course_title} colour={nextDue.course_colour} />
              </div>
              <p className="fn-mono mt-1.5 text-xs text-[var(--fn-muted)]">{daysUntil(nextDue.due_at)}</p>
            </Link>
          )}

          <div className="rounded-md border border-[var(--fn-rule)] p-4">
            <p className="fn-eyebrow">This week</p>
            <div className="mt-3 flex justify-between">
              {weekDays.map((day, index) => {
                const plannedMinutes = weekBlocks
                  .filter((b) => b.start_at.slice(0, 10) === day.date && b.status !== "skipped" && b.status !== "suggested")
                  .reduce((sum, b) => sum + (new Date(b.end_at).getTime() - new Date(b.start_at).getTime()) / 60_000, 0);
                const dayState = weekState(plannedMinutes, day.recommended_study_minutes);
                const isToday = day.date === today.date;
                return (
                  <div key={day.date} className="flex flex-col items-center gap-1.5">
                    <span className="fn-mono text-[10px] text-[var(--fn-muted)]">{DAY_LETTERS[index]}</span>
                    <span
                      className={`h-2 w-2 rounded-full ${isToday ? "ring-2 ring-offset-1 ring-[var(--fn-cobalt)]" : ""}`}
                      style={{ backgroundColor: day.is_break ? "var(--fn-rule)" : STATE_RING_COLOUR[dayState] }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </aside>
      </div>

      {notificationsOpen && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 px-4"
          role="dialog"
          aria-modal="true"
          aria-label="Notifications"
          onClick={() => setNotificationsOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-md border border-[var(--fn-rule)] bg-[var(--fn-paper)] p-4 shadow-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <p className="fn-eyebrow">Notifications</p>
              <button
                type="button"
                onClick={() => setNotificationsOpen(false)}
                aria-label="Close"
                className="rounded text-[var(--fn-muted)] hover:text-[var(--fn-ink)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {notifications.length === 0 ? (
              <p className="mt-3 text-sm text-[var(--fn-muted)]">No notifications yet.</p>
            ) : (
              <ul className="mt-3 flex max-h-80 flex-col gap-1 overflow-y-auto">
                {notifications.map((notification) => (
                  <li key={notification.id}>
                    <button
                      type="button"
                      onClick={() => markRead(notification.id)}
                      className={`w-full rounded-md px-3 py-2 text-left text-sm ${
                        notification.read_at
                          ? "text-[var(--fn-muted)]"
                          : "bg-[var(--fn-canvas)] text-[var(--fn-ink)]"
                      }`}
                    >
                      {notification.message}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
