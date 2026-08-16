// Week/day timeline geometry shared by the Calendar grid
// (app/(app)/calendar/page.tsx) and the Dashboard TimetableWidget — a
// fixed 7am–10pm window covers the vast majority of classes/study blocks
// without scrolling; entries outside it clip at the edge rather than
// growing the grid for a rare 6am or midnight entry.
export const TIMELINE_START_HOUR = 7;
export const TIMELINE_END_HOUR = 22;
export const HOUR_HEIGHT_PX = 48;

export function timelineHours(): number[] {
  const hours: number[] = [];
  for (let h = TIMELINE_START_HOUR; h <= TIMELINE_END_HOUR; h++) hours.push(h);
  return hours;
}

export function hourLabel(hour: number): string {
  const period = hour < 12 ? "AM" : "PM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour} ${period}`;
}

export interface TimelinePosition {
  top: number;
  height: number;
}

// Virtual occurrences from /api/calendar/occurrences — expanded
// ClassSession/Commitment rows, not real CalendarBlocks.
export interface CalendarOccurrence {
  source: "class_session" | "commitment";
  sourceId: number;
  date: string;
  startTime: string;
  endTime: string;
  title: string;
  location: string | null;
  type: string;
  description: string | null;
  remindMinutesBefore: number | null;
  remindRecurring: boolean;
}

export function occurrenceStyle(source: CalendarOccurrence["source"]): string {
  if (source === "class_session") {
    return "border border-[var(--fn-sage)] bg-[var(--fn-sage)]/10 text-[var(--fn-sage)]";
  }
  return "border border-[var(--fn-ochre)] bg-[var(--fn-ochre)]/10 text-[var(--fn-ochre)]";
}

// Minutes since TIMELINE_START_HOUR:00, clamped to the visible window, for
// occurrences that only carry a plain "HH:mm" time rather than a full ISO
// instant (unlike CalendarBlock's start_at/end_at).
export function timelineMinutesFromTime(time: string): number {
  const [hourStr, minuteStr] = time.split(":");
  const minutes = Number(hourStr) * 60 + Number(minuteStr);
  const startMinutes = TIMELINE_START_HOUR * 60;
  const endMinutes = TIMELINE_END_HOUR * 60;
  return Math.min(Math.max(minutes, startMinutes), endMinutes) - startMinutes;
}

export function occurrenceTimelinePosition(occurrence: CalendarOccurrence): TimelinePosition {
  const top = (timelineMinutesFromTime(occurrence.startTime) / 60) * HOUR_HEIGHT_PX;
  const rawStart = timelineMinutesFromTime(occurrence.startTime);
  const rawEnd = timelineMinutesFromTime(occurrence.endTime);
  const height = Math.max(((rawEnd - rawStart) / 60) * HOUR_HEIGHT_PX, 18);
  return { top, height };
}
