import { describe, expect, it } from "vitest";
import {
  hourLabel,
  occurrenceStyle,
  occurrenceTimelinePosition,
  timelineHours,
  timelineMinutesFromTime,
  TIMELINE_START_HOUR,
  TIMELINE_END_HOUR,
  HOUR_HEIGHT_PX,
  type CalendarOccurrence,
} from "./timeline";

describe("timelineHours", () => {
  it("spans the full window inclusive of both ends", () => {
    const hours = timelineHours();
    expect(hours[0]).toBe(TIMELINE_START_HOUR);
    expect(hours[hours.length - 1]).toBe(TIMELINE_END_HOUR);
    expect(hours.length).toBe(TIMELINE_END_HOUR - TIMELINE_START_HOUR + 1);
  });
});

describe("hourLabel", () => {
  it("labels midnight as 12 AM", () => {
    expect(hourLabel(0)).toBe("12 AM");
  });

  it("labels noon as 12 PM", () => {
    expect(hourLabel(12)).toBe("12 PM");
  });

  it("labels a morning hour", () => {
    expect(hourLabel(9)).toBe("9 AM");
  });

  it("labels an afternoon hour", () => {
    expect(hourLabel(15)).toBe("3 PM");
  });
});

describe("timelineMinutesFromTime", () => {
  it("returns minutes since the window start for a time inside it", () => {
    expect(timelineMinutesFromTime(`${TIMELINE_START_HOUR + 1}:30`)).toBe(90);
  });

  it("clamps a time before the window start to 0", () => {
    expect(timelineMinutesFromTime("00:00")).toBe(0);
  });

  it("clamps a time after the window end to the window's own length", () => {
    const windowMinutes = (TIMELINE_END_HOUR - TIMELINE_START_HOUR) * 60;
    expect(timelineMinutesFromTime("23:59")).toBe(windowMinutes);
  });
});

describe("occurrenceStyle", () => {
  it("differs between class sessions and commitments", () => {
    expect(occurrenceStyle("class_session")).not.toBe(occurrenceStyle("commitment"));
  });
});

function occurrence(startTime: string, endTime: string): CalendarOccurrence {
  return {
    source: "class_session",
    sourceId: 1,
    date: "2026-01-12",
    startTime,
    endTime,
    title: "Lecture",
    location: null,
    type: "lecture",
    description: null,
    remindMinutesBefore: null,
    remindRecurring: false,
  };
}

describe("occurrenceTimelinePosition", () => {
  it("places a one-hour block one hour's height tall", () => {
    const start = `${TIMELINE_START_HOUR + 1}:00`;
    const end = `${TIMELINE_START_HOUR + 2}:00`;
    const { top, height } = occurrenceTimelinePosition(occurrence(start, end));
    expect(top).toBe(HOUR_HEIGHT_PX);
    expect(height).toBe(HOUR_HEIGHT_PX);
  });

  it("gives a very short block a minimum visible height", () => {
    const start = `${TIMELINE_START_HOUR + 1}:00`;
    const end = `${TIMELINE_START_HOUR + 1}:05`;
    const { height } = occurrenceTimelinePosition(occurrence(start, end));
    expect(height).toBe(18);
  });
});
