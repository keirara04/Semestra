import type { Semester } from "@/lib/types";

// Semester.start_date/end_date come back from the API as full ISO
// timestamps ("2026-09-01T00:00:00.000000Z"), not plain "Y-m-d" — always
// normalize before string-comparing or hand-parsing dates.
function toDateOnly(value: string): string {
  return value.slice(0, 10);
}

/** Prefers the semester containing today; otherwise the nearest upcoming one. */
export function pickCurrentSemester(semesters: Semester[]): Semester | null {
  if (semesters.length === 0) return null;
  const today = toDateOnly(new Date().toISOString());
  const current = semesters.find(
    (s) => toDateOnly(s.start_date) <= today && today <= toDateOnly(s.end_date),
  );
  if (current) return current;
  const future = semesters
    .filter((s) => toDateOnly(s.start_date) > today)
    .sort((a, b) => toDateOnly(a.start_date).localeCompare(toDateOnly(b.start_date)))[0];
  return future ?? semesters[semesters.length - 1];
}

/** 1-indexed week number since a semester's start_date, for a given week's Monday/Sunday-start date. */
export function weekNumberSince(semesterStartDate: string, weekStart: Date): number {
  const start = new Date(`${toDateOnly(semesterStartDate)}T00:00:00`);
  const diffDays = Math.floor((weekStart.getTime() - start.getTime()) / 86_400_000);
  return Math.floor(diffDays / 7) + 1;
}

/**
 * Resolves which semester is "active" for display: the requested id if it
 * still exists in the list, otherwise the same fallback pickCurrentSemester
 * uses. Centralizes every page's semester-selection logic so `?semester=`
 * deep links, stale/deleted ids, and the plain "no id given" case are all
 * handled in one place.
 */
export function resolveActiveSemester(
  semesters: Semester[],
  requestedId: string | number | null | undefined,
): Semester | null {
  if (requestedId !== null && requestedId !== undefined && requestedId !== "") {
    const id = typeof requestedId === "number" ? requestedId : Number(requestedId);
    if (Number.isFinite(id)) {
      const match = semesters.find((s) => s.id === id);
      if (match) return match;
    }
  }
  return pickCurrentSemester(semesters);
}
