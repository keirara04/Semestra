// Pure date/geometry/formatting helpers for the Calendar page
// (app/(app)/calendar/page.tsx) — split out because none of this closes
// over that component's state, so it can be unit-tested and read on its
// own. CalendarOccurrence-related geometry (a separate, occurrence-only
// timeline) lives in @/lib/timeline instead, shared with the Dashboard
// TimetableWidget.
import { HOUR_HEIGHT_PX, TIMELINE_END_HOUR, TIMELINE_START_HOUR, type TimelinePosition } from "./timeline";
import type { CalendarBlock } from "./types";

export type CalendarView = "month" | "week" | "day";

export const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Presets are offsets from the block's current start_at, picked at
// selection time and stored as an absolute remind_at — moving the block
// afterward does not recompute it. null = no reminder.
export const REMINDER_PRESETS: { label: string; minutes: number | null }[] = [
  { label: "None", minutes: null },
  { label: "At start time", minutes: 0 },
  { label: "5 minutes before", minutes: 5 },
  { label: "15 minutes before", minutes: 15 },
  { label: "30 minutes before", minutes: 30 },
  { label: "1 hour before", minutes: 60 },
  { label: "1 day before", minutes: 1440 },
];

// Common commuting-student timezones plus whatever the browser reports —
// a curated shortlist, not the full ~400-zone IANA database: this is a
// quick display switch (Notion's "compare a friend's time"), not the
// account-level timezone setting already in Settings.
export const TIMEZONE_OPTIONS = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Berlin",
  "Asia/Jakarta",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
];

export function startOfWeek(date: Date): Date {
  const day = date.getDay();
  const start = new Date(date);
  start.setDate(date.getDate() - day);
  start.setHours(0, 0, 0, 0);
  return start;
}

export function startOfMonth(date: Date): Date {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  start.setHours(0, 0, 0, 0);
  return start;
}

export function endOfMonth(date: Date): Date {
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  end.setHours(0, 0, 0, 0);
  return end;
}

export function addDays(date: Date, amount: number): Date {
  const next = new Date(date);
  next.setDate(date.getDate() + amount);
  return next;
}

// Grid always covers full weeks (Sun–Sat) so the month renders as a clean rectangle.
export function monthGridDays(monthAnchor: Date): Date[] {
  const gridStart = startOfWeek(startOfMonth(monthAnchor));
  const gridEnd = startOfWeek(endOfMonth(monthAnchor));
  const days: Date[] = [];
  for (let d = gridStart; d <= addDays(gridEnd, 6); d = addDays(d, 1)) {
    days.push(d);
  }
  return days;
}

// Local Y-m-d, not toISOString().slice(0, 10) — toISOString() converts to
// UTC first, so for any timezone ahead of UTC (Korea, +9, among others) a
// local midnight rolls back to the previous UTC day, silently shifting
// every date-keyed lookup (occurrences, blocks, capacity) back by one day.
export function toDateParam(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isToday(dateString: string): boolean {
  return dateString === toDateParam(new Date());
}

// timeZone is display-only (Phase 1's timezone switcher changes how times
// of day are *shown*, not which calendar day an instant belongs to) — see
// "Timezone switcher" scoping note in the calendar roadmap plan.
export function formatTime(iso: string, timeZone?: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", timeZone });
}

export function monthLabel(anchorDate: Date): string {
  return anchorDate.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

export function weekLabel(weekStart: Date): string {
  const weekEnd = addDays(weekStart, 6);
  const sameMonth = weekStart.getMonth() === weekEnd.getMonth();
  const startLabel = weekStart.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const endLabel = weekEnd.toLocaleDateString(undefined, sameMonth ? { day: "numeric" } : { month: "short", day: "numeric" });
  return `${startLabel} – ${endLabel}, ${weekEnd.getFullYear()}`;
}

export function dayLabel(anchorDate: Date): string {
  return anchorDate.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
}

export function viewLabel(view: CalendarView, anchorDate: Date): string {
  if (view === "week") return weekLabel(startOfWeek(anchorDate));
  if (view === "day") return dayLabel(anchorDate);
  return monthLabel(anchorDate);
}

export function systemTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
}

// Direction-aware morph on month change: Prev/Next slide from the side
// they travel toward (matching the page-turn nav arrows), Today just
// fades — no implied direction for a jump back to now.
export function monthMorphClass(direction: 1 | -1 | 0): string {
  if (direction === -1) return "fn-month-in-left";
  if (direction === 1) return "fn-month-in-right";
  return "fn-month-in-fade";
}

export function weekChunks<T>(items: T[]): T[][] {
  const weeks: T[][] = [];
  for (let i = 0; i < items.length; i += 7) weeks.push(items.slice(i, i + 7));
  return weeks;
}

// Suggested blocks get a dashed outline, committed (accepted/moved/done)
// blocks a solid one: the distinction between "the plan suggested this"
// and "you committed to this" is load-bearing for trust, per "Calendar
// view" in mdfile/DESIGN.md. Pulled-from-Google blocks get their own
// color (sage, same token the read-only ClassSession/Commitment
// occurrences use) — "synced in from elsewhere," not a Semestra-owned
// suggestion or commitment, regardless of status.
export function blockStyle(block: CalendarBlock): string {
  if (block.type === "external") {
    return "border border-[var(--fn-sage)] bg-[var(--fn-sage)]/10 text-[var(--fn-sage)]";
  }
  if (block.status === "suggested") {
    return "border border-dashed border-[var(--fn-cobalt)] text-[var(--fn-cobalt)]";
  }
  if (block.status === "skipped") {
    return "border border-[var(--fn-rule)] text-[var(--fn-muted)] line-through";
  }
  return "border border-[var(--fn-cobalt)] bg-[var(--fn-cobalt)]/10 text-[var(--fn-cobalt)]";
}

// Shared by the hover preview and the details popup so the two never
// drift on how a block's type/status gets labeled — they used to, before
// this: the hover preview never learned about type: "external" when the
// details popup did.
export function blockTypeLabel(block: CalendarBlock): string {
  if (block.type === "lecture") return "Lecture";
  if (block.type === "external") return "From Google Calendar";
  if (block.status === "suggested") return "Suggested";
  return "Block";
}

// Lecture blocks come from the class timetable, external ones from a
// connected Google Calendar — neither is something a student drags
// around day to day or edits here; the details popup hides Edit/Delete
// for both the same way.
export function isBlockDraggable(block: CalendarBlock): boolean {
  return block.type !== "lecture" && block.type !== "external";
}

// Minutes since TIMELINE_START_HOUR:00, clamped to the visible window —
// the geometry input shared by both the pixel-position calc and the
// column-packing algorithm below.
export function timelineMinutes(iso: string): number {
  const date = new Date(iso);
  const minutes = date.getHours() * 60 + date.getMinutes();
  const startMinutes = TIMELINE_START_HOUR * 60;
  const endMinutes = TIMELINE_END_HOUR * 60;
  return Math.min(Math.max(minutes, startMinutes), endMinutes) - startMinutes;
}

export function timelineBlockPosition(block: CalendarBlock): TimelinePosition {
  const top = (timelineMinutes(block.start_at) / 60) * HOUR_HEIGHT_PX;
  const rawEnd = timelineMinutes(block.end_at);
  const rawStart = timelineMinutes(block.start_at);
  const height = Math.max(((rawEnd - rawStart) / 60) * HOUR_HEIGHT_PX, 18);
  return { top, height };
}

// Pixel offset within a timeline column -> minutes-since-midnight,
// snapped to a quarter hour and clamped to the visible window. Shared by
// click-drag create (the pointer's raw offset) and its preview overlay.
export function minutesFromTimelineOffset(offsetY: number): number {
  const raw = TIMELINE_START_HOUR * 60 + (offsetY / HOUR_HEIGHT_PX) * 60;
  const snapped = Math.round(raw / 15) * 15;
  return Math.min(Math.max(snapped, TIMELINE_START_HOUR * 60), TIMELINE_END_HOUR * 60);
}

export function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

export interface LaidOutBlock {
  block: CalendarBlock;
  column: number;
  columns: number;
}

// Simple greedy interval-column packing (same idea Google/Notion Calendar
// use for overlapping events): sort by start time, place each block in
// the first column whose previous occupant has already ended, otherwise
// open a new column. Columns are shared across the whole day rather than
// per overlap-cluster — slightly wider than optimal when two unrelated
// overlaps happen the same day, but far simpler, and that's a rare case
// for a solo study calendar.
export function layoutDayBlocks(dayBlocks: CalendarBlock[]): LaidOutBlock[] {
  const sorted = [...dayBlocks].sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());
  const columnEnds: number[] = [];
  const placed: { block: CalendarBlock; column: number }[] = [];

  for (const block of sorted) {
    const start = new Date(block.start_at).getTime();
    const end = new Date(block.end_at).getTime();
    let column = columnEnds.findIndex((endTime) => endTime <= start);
    if (column === -1) {
      column = columnEnds.length;
      columnEnds.push(end);
    } else {
      columnEnds[column] = end;
    }
    placed.push({ block, column });
  }

  const columns = Math.max(columnEnds.length, 1);
  return placed.map(({ block, column }) => ({ block, column, columns }));
}

export interface PlanSuggestionItem {
  taskId: number;
  title: string;
  courseId: number | null;
  courseTitle: string | null;
  minutes: number;
  startTime: string;
  endTime: string;
}

export interface PlanSuggestionDay {
  date: string;
  totalMinutes: number;
  items: PlanSuggestionItem[];
}
