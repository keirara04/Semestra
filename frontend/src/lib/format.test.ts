import { describe, expect, it, vi, afterEach } from "vitest";
import { daysUntil, formatMinutes } from "./format";

describe("formatMinutes", () => {
  it("returns 0m for null, undefined, or zero", () => {
    expect(formatMinutes(null)).toBe("0m");
    expect(formatMinutes(undefined)).toBe("0m");
    expect(formatMinutes(0)).toBe("0m");
  });

  it("formats minutes under an hour", () => {
    expect(formatMinutes(45)).toBe("45m");
  });

  it("formats whole hours with no leftover minutes", () => {
    expect(formatMinutes(120)).toBe("2h");
  });

  it("formats hours and minutes together", () => {
    expect(formatMinutes(125)).toBe("2h 5m");
  });
});

describe("daysUntil", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("reports overdue for a past date", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-10T12:00:00Z"));
    expect(daysUntil("2026-01-09T12:00:00Z")).toBe("overdue");
  });

  it("reports due today when less than a day has passed since due", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-10T08:00:00Z"));
    expect(daysUntil("2026-01-10T02:00:00Z")).toBe("due today");
  });

  it("reports due tomorrow for anything up to 24h out", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-10T08:00:00Z"));
    expect(daysUntil("2026-01-11T08:00:00Z")).toBe("due tomorrow");
  });

  it("reports the day count further out", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-10T08:00:00Z"));
    expect(daysUntil("2026-01-15T08:00:00Z")).toBe("due in 5d");
  });
});
