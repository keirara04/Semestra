import { describe, expect, it } from "vitest";
import {
  addDays,
  isToday,
  layoutDayBlocks,
  minutesFromTimelineOffset,
  minutesToTime,
  monthGridDays,
  startOfMonth,
  startOfWeek,
  toDateParam,
  weekChunks,
} from "./calendar";
import type { CalendarBlock } from "./types";

describe("toDateParam", () => {
  it("formats a local date as Y-m-d regardless of timezone conversion pitfalls", () => {
    const date = new Date(2026, 0, 5); // Jan 5, local time
    expect(toDateParam(date)).toBe("2026-01-05");
  });

  it("pads single-digit months and days", () => {
    expect(toDateParam(new Date(2026, 8, 3))).toBe("2026-09-03");
  });
});

describe("isToday", () => {
  it("matches today's own date string", () => {
    expect(isToday(toDateParam(new Date()))).toBe(true);
  });

  it("rejects a different date", () => {
    expect(isToday("1999-01-01")).toBe(false);
  });
});

describe("startOfWeek", () => {
  it("rolls back to the preceding Sunday", () => {
    const wednesday = new Date(2026, 0, 7); // Jan 7 2026 is a Wednesday
    const result = startOfWeek(wednesday);
    expect(result.getDay()).toBe(0);
    expect(toDateParam(result)).toBe("2026-01-04");
  });
});

describe("startOfMonth", () => {
  it("returns the 1st at midnight", () => {
    const result = startOfMonth(new Date(2026, 5, 17, 14, 30));
    expect(result.getDate()).toBe(1);
    expect(result.getHours()).toBe(0);
  });
});

describe("addDays", () => {
  it("adds positive days", () => {
    expect(toDateParam(addDays(new Date(2026, 0, 30), 3))).toBe("2026-02-02");
  });

  it("subtracts with a negative amount", () => {
    expect(toDateParam(addDays(new Date(2026, 1, 2), -3))).toBe("2026-01-30");
  });
});

describe("monthGridDays", () => {
  it("always returns a whole number of weeks", () => {
    const days = monthGridDays(new Date(2026, 1, 15)); // Feb 2026
    expect(days.length % 7).toBe(0);
  });

  it("starts on a Sunday and ends on a Saturday", () => {
    const days = monthGridDays(new Date(2026, 1, 15));
    expect(days[0].getDay()).toBe(0);
    expect(days[days.length - 1].getDay()).toBe(6);
  });
});

describe("weekChunks", () => {
  it("splits a flat list into chunks of 7", () => {
    const items = Array.from({ length: 21 }, (_, i) => i);
    const chunks = weekChunks(items);
    expect(chunks.length).toBe(3);
    expect(chunks[0]).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it("leaves a partial final chunk short", () => {
    const chunks = weekChunks([1, 2, 3]);
    expect(chunks).toEqual([[1, 2, 3]]);
  });
});

describe("minutesFromTimelineOffset", () => {
  it("snaps to the nearest quarter hour", () => {
    // 7 minutes past 7am (7*60=420) worth of pixels, at 48px/hour.
    const offsetPx = (7 / 60) * 48;
    expect(minutesFromTimelineOffset(offsetPx) % 15).toBe(0);
  });

  it("clamps below the window start", () => {
    expect(minutesFromTimelineOffset(-1000)).toBe(7 * 60);
  });

  it("clamps above the window end", () => {
    expect(minutesFromTimelineOffset(1_000_000)).toBe(22 * 60);
  });
});

describe("minutesToTime", () => {
  it("formats HH:mm with zero padding", () => {
    expect(minutesToTime(9 * 60 + 5)).toBe("09:05");
  });
});

function block(id: number, startAt: string, endAt: string): CalendarBlock {
  return {
    id,
    task_id: null,
    type: "study",
    status: "accepted",
    title: `Block ${id}`,
    location: null,
    description: null,
    remind_at: null,
    start_at: startAt,
    end_at: endAt,
    recurrence_group_id: null,
    recurrence_day_of_week: null,
    recurrence_until: null,
    source: null,
    external_id: null,
  };
}

describe("layoutDayBlocks", () => {
  it("gives non-overlapping blocks a single shared column", () => {
    const blocks = [
      block(1, "2026-01-05T09:00:00Z", "2026-01-05T10:00:00Z"),
      block(2, "2026-01-05T10:00:00Z", "2026-01-05T11:00:00Z"),
    ];
    const laidOut = layoutDayBlocks(blocks);
    expect(laidOut.every((l) => l.column === 0 && l.columns === 1)).toBe(true);
  });

  it("splits overlapping blocks into separate columns", () => {
    const blocks = [
      block(1, "2026-01-05T09:00:00Z", "2026-01-05T11:00:00Z"),
      block(2, "2026-01-05T09:30:00Z", "2026-01-05T10:30:00Z"),
    ];
    const laidOut = layoutDayBlocks(blocks);
    const columns = new Set(laidOut.map((l) => l.column));
    expect(columns.size).toBe(2);
    expect(laidOut[0].columns).toBe(2);
  });

  it("reuses a column once its previous occupant has ended", () => {
    const blocks = [
      block(1, "2026-01-05T09:00:00Z", "2026-01-05T10:00:00Z"),
      block(2, "2026-01-05T10:00:00Z", "2026-01-05T11:00:00Z"),
      block(3, "2026-01-05T09:30:00Z", "2026-01-05T10:30:00Z"),
    ];
    const laidOut = layoutDayBlocks(blocks);
    expect(laidOut.every((l) => l.columns === 2));
  });
});
