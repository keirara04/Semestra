import { describe, expect, it } from "vitest";
import { pickCurrentSemester, resolveActiveSemester, weekNumberSince } from "./semester";
import type { Semester } from "./types";

function semester(id: number, name: string, start: string, end: string): Semester {
  return { id, name, start_date: start, end_date: end };
}

const PAST = semester(1, "Fall 2025", "2025-09-01T00:00:00.000000Z", "2025-12-15T00:00:00.000000Z");
const FUTURE = semester(2, "Spring 2099", "2099-01-06T00:00:00.000000Z", "2099-05-01T00:00:00.000000Z");

describe("resolveActiveSemester", () => {
  it("returns null for an empty list regardless of requested id", () => {
    expect(resolveActiveSemester([], 1)).toBeNull();
    expect(resolveActiveSemester([], null)).toBeNull();
  });

  it("prefers the requested id when it exists in the list", () => {
    expect(resolveActiveSemester([PAST, FUTURE], PAST.id)).toBe(PAST);
    expect(resolveActiveSemester([PAST, FUTURE], String(FUTURE.id))).toBe(FUTURE);
  });

  it("falls back to pickCurrentSemester when the id is absent", () => {
    expect(resolveActiveSemester([PAST, FUTURE], null)).toBe(pickCurrentSemester([PAST, FUTURE]));
    expect(resolveActiveSemester([PAST, FUTURE], undefined)).toBe(pickCurrentSemester([PAST, FUTURE]));
    expect(resolveActiveSemester([PAST, FUTURE], "")).toBe(pickCurrentSemester([PAST, FUTURE]));
  });

  it("falls back when the id is not numeric", () => {
    expect(resolveActiveSemester([PAST, FUTURE], "not-a-number")).toBe(pickCurrentSemester([PAST, FUTURE]));
  });

  it("falls back when the id does not match any semester (deleted term, foreign account)", () => {
    expect(resolveActiveSemester([PAST, FUTURE], 999)).toBe(pickCurrentSemester([PAST, FUTURE]));
  });
});

describe("weekNumberSince", () => {
  it("is unaffected by resolveActiveSemester's changes", () => {
    expect(weekNumberSince(PAST.start_date, new Date("2025-09-01T00:00:00"))).toBe(1);
  });
});
