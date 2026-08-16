"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { Bell, CheckCircle2, Clock, TrendingUp, X } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import type { CalendarBlock, DayCapacity, Today, WeeklyReview } from "@/lib/types";
import { WEEK_STATE_LABEL, weekState, type WeekState } from "@/components/WeekState";
import { useNotifications } from "@/lib/notifications";
import { useActiveSemester } from "@/lib/hooks/use-active-semester";
import { TimetableWidget } from "@/components/TimetableWidget";
import { weekNumberSince } from "@/lib/semester";
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

// Local Y-m-d, not toISOString().slice(0, 10) — see calendar/page.tsx's
// toDateParam for why: UTC conversion silently shifts the date back a day
// for any timezone ahead of UTC.
function toDateParam(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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
  return (
    <Suspense fallback={null}>
      <DashboardPageInner />
    </Suspense>
  );
}

function DashboardPageInner() {
  const { user } = useAuth();
  const [today, setToday] = useState<Today | null>(null);
  const [expandedTaskId, setExpandedTaskId] = useState<number | null>(null);
  const [pendingReview, setPendingReview] = useState<WeeklyReview | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  // Read-only here: dashboard data (/api/today) is always "today", so a
  // switcher would only ever change this label, not any real content —
  // this just picks up ?semester= if a link arrived carrying one.
  const { activeSemester: semester } = useActiveSemester();
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

  // Real numbers only — no invented "good day for deep work" judgment,
  // just what's actually on today.tasks/today.capacity.
  const estimateMinutesToday = today.tasks.reduce(
    (sum, task) => sum + (task.remaining_estimate_minutes ?? task.estimated_minutes ?? 0),
    0,
  );
  const openMinutesToday = Math.max(0, today.capacity.available_minutes - today.planned_minutes_today);

  const upcomingSorted = [...today.assessments_due_soon].sort(
    (a, b) => new Date(a.due_at).getTime() - new Date(b.due_at).getTime(),
  );

  // Per-day planned minutes/state, shared by the "This week" dot rail and
  // the semester-pulse aggregate below it — one calculation, not two.
  const weekDayStats = weekDays.map((day) => {
    const plannedMinutes = weekBlocks
      .filter((b) => b.start_at.slice(0, 10) === day.date && b.status !== "skipped" && b.status !== "suggested")
      .reduce((sum, b) => sum + (new Date(b.end_at).getTime() - new Date(b.start_at).getTime()) / 60_000, 0);
    return { day, plannedMinutes, state: weekState(plannedMinutes, day.recommended_study_minutes) };
  });
  const daysOnTrack = weekDayStats.filter(({ state }) => state === "comfortable" || state === "busy").length;
  const doneBlocksThisWeek = weekBlocks.filter((b) => b.status === "done");
  const studiedMinutesThisWeek = doneBlocksThisWeek.reduce(
    (sum, b) => sum + (new Date(b.end_at).getTime() - new Date(b.start_at).getTime()) / 60_000,
    0,
  );

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
              <p className="mt-1 text-sm text-[var(--fn-muted)]">
                No classes today
                {openMinutesToday > 0 && ` · ${formatMinutes(openMinutesToday)} open`}
              </p>
            )}
            {today.tasks.length > 0 && (
              <p className="fn-mono mt-1 text-xs text-[var(--fn-muted)]">
                {today.tasks.length} {today.tasks.length === 1 ? "task" : "tasks"} planned
                {estimateMinutesToday > 0 && ` · ${formatMinutes(estimateMinutesToday)} estimated`}
              </p>
            )}
            {/* Same one-line verdict the aside's Workload card shows in
                full, surfaced here too on mobile so it's not buried below
                the corkboard and Upcoming strip. */}
            <p className="fn-mono mt-1.5 text-xs md:hidden" style={{ color: STATE_RING_COLOUR[state] }}>
              Workload: {WEEK_STATE_LABEL[state]} · {formatMinutes(today.planned_minutes_today)} planned
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setNotificationsOpen(true)}
          aria-label={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : "Notifications"}
          className="fn-nav-arrow relative shrink-0"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute right-0 top-0.5 h-2 w-2 rounded-full bg-[var(--fn-ochre)]" />
          )}
        </button>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-[1fr_260px]">
        <div className="min-w-0">
          {/* Today's board — pinned index cards, corkboard */}
          <section>
            <p className="fn-eyebrow">Today&apos;s board</p>

            {visibleTasks.length === 0 ? (
              <p className="mt-3 text-sm text-[var(--fn-muted)]">
                Nothing urgent. Next planned work is your upcoming deadlines below.
              </p>
            ) : (
              <div className="fn-cork fn-scroll-fade mt-3 overflow-x-auto rounded-md p-4 sm:overflow-visible">
                <div className="flex snap-x snap-mandatory flex-nowrap items-start gap-x-5 gap-y-6 sm:flex-wrap sm:snap-none">
                  {visibleTasks.map((task, index) => {
                    const expanded = expandedTaskId === task.id;
                    const tilt = expanded ? 0 : index % 2 === 0 ? -1.5 : 1.5;
                    const isPrimary = index === 0;
                    return (
                      <div
                        key={task.id}
                        className="relative w-44 shrink-0 snap-start"
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
                            boxShadow: isPrimary ? `0 0 0 1.5px ${task.course_colour}` : undefined,
                          }}
                        >
                          {isPrimary && (
                            <span className="fn-mono mb-1.5 block text-[9px] font-semibold tracking-widest text-[var(--fn-muted)] uppercase">
                              Start here
                            </span>
                          )}
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

          <TimetableWidget />

          {/* Upcoming — index cards */}
          <section className="mt-8">
            <p className="fn-eyebrow">Upcoming</p>
            {upcomingSorted.length === 0 ? (
              <p className="mt-3 text-sm text-[var(--fn-muted)]">Nothing due in the next two weeks.</p>
            ) : (
              <ul className="fn-scroll-fade mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1">
                {upcomingSorted.map((assessment) => (
                  <li
                    key={assessment.id}
                    className="flex shrink-0 snap-start flex-col gap-1 rounded-md p-3"
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

          {/* Semester pulse — real week aggregates (done sessions, hours
              studied, days on track), not a fabricated activity feed.
              Fills the space Recent Notestra will take once that data
              exists; swap this out rather than stack both. */}
          {weekDayStats.length > 0 && (
            <section className="fn-mono mt-8 flex flex-wrap items-center gap-x-5 gap-y-1.5 rounded-md border border-[var(--fn-rule)] px-4 py-3 text-xs text-[var(--fn-muted)]">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                {doneBlocksThisWeek.length} {doneBlocksThisWeek.length === 1 ? "session" : "sessions"} completed this
                week
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" aria-hidden />
                {formatMinutes(studiedMinutesThisWeek)} studied
              </span>
              <span className="flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5" aria-hidden />
                {daysOnTrack}/{weekDayStats.length} days on track
              </span>
            </section>
          )}
        </div>

        {/* At a glance rail — horizontal scroll-snap strip below md (same
            pattern as the corkboard/Upcoming strips) so three full-width
            stacked boxes never appear on tablet/narrow-desktop; a plain
            vertical stack from md up. */}
        <aside className="fn-scroll-fade flex snap-x snap-mandatory gap-4 overflow-x-auto pb-1 md:flex-col md:overflow-visible md:pb-0 md:[mask-image:none]">
          <div
            className="flex w-64 shrink-0 snap-start flex-col items-center gap-2 rounded-sm border border-t-[3px] border-[var(--fn-rule)] p-4 md:w-auto"
            style={{ borderTopColor: "var(--fn-cobalt)" }}
          >
            <p className="fn-eyebrow self-start">Workload</p>
            <WorkloadRing percent={rawPercent} ringPercent={Math.min(100, rawPercent)} colour={STATE_RING_COLOUR[state]} />
            <p className="text-sm font-medium">{WEEK_STATE_LABEL[state]}</p>
            <p className="fn-mono text-center text-xs text-[var(--fn-muted)]">
              {formatMinutes(today.planned_minutes_today)} planned /{" "}
              {formatMinutes(today.capacity.recommended_study_minutes)} capacity
            </p>
            {openMinutesToday > 0 && (
              <p className="fn-mono text-center text-[11px] text-[var(--fn-sage)]">
                +{formatMinutes(openMinutesToday)} open today
              </p>
            )}
          </div>

          {nextDue && (
            <Link
              href={`/assessments/${nextDue.id}`}
              className="block w-64 shrink-0 snap-start rounded-sm p-4 hover:brightness-95 md:w-auto"
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

          <div className="w-64 shrink-0 snap-start rounded-sm border border-[var(--fn-rule)] p-4 md:w-auto">
            <p className="fn-eyebrow">This week</p>
            <div className="mt-3 flex justify-between">
              {weekDayStats.map(({ day, state: dayState }, index) => {
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
            {weekDayStats.length > 0 && (
              <p className="fn-mono mt-3 text-xs text-[var(--fn-muted)]">
                {doneBlocksThisWeek.length} done · {formatMinutes(studiedMinutesThisWeek)} studied
              </p>
            )}
          </div>
        </aside>
      </div>

      {notificationsOpen && (
        <div
          className="fn-popup-backdrop fixed inset-0 z-40 flex items-center justify-center bg-black/30 px-4"
          role="dialog"
          aria-modal="true"
          aria-label="Notifications"
          onClick={() => setNotificationsOpen(false)}
        >
          <div
            className="fn-popup-card w-full max-w-sm rounded-lg border border-[var(--fn-rule)] bg-[var(--fn-paper)] p-4 shadow-xl"
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
