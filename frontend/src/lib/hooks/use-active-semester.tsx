"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { apiFetch, logApiError } from "@/lib/api";
import { resolveActiveSemester } from "@/lib/semester";
import type { Semester } from "@/lib/types";

const STORAGE_KEY = "semestra:active-semester";
const PARAM = "semester";

interface SemestersContextValue {
  semesters: Semester[] | null;
  setSemesters: Dispatch<SetStateAction<Semester[] | null>>;
}

const SemestersContext = createContext<SemestersContextValue | null>(null);

// Fetches /api/semesters exactly once per (app) session, not once per
// component: dashboard, calendar, courses, semester, and TimetableWidget
// (nested inside dashboard) all call useActiveSemester, so without this
// shared context each of those independently re-fetched the same list on
// every mount — five-plus duplicate requests just from loading one page,
// multiplied again by React Strict Mode's dev double-invoke, easily
// enough to trip the API throttle from ordinary navigation.
export function SemestersProvider({ children }: { children: ReactNode }) {
  const [semesters, setSemesters] = useState<Semester[] | null>(null);

  useEffect(() => {
    apiFetch<Semester[]>("/api/semesters").then(setSemesters).catch(logApiError);
  }, []);

  const value = useMemo(() => ({ semesters, setSemesters }), [semesters]);

  return <SemestersContext.Provider value={value}>{children}</SemestersContext.Provider>;
}

/**
 * Owns the "which semester is the user looking at" question for every page
 * that needs it. Source of truth is the `?semester=<id>` URL param so a
 * non-current semester view is deep-linkable and survives reload; when the
 * param is absent, falls back to the last semester picked on any page
 * (localStorage), then to pickCurrentSemester. An id that no longer exists
 * (deleted term, stale link) is silently dropped rather than erroring.
 */
export function useActiveSemester() {
  const context = useContext(SemestersContext);
  if (!context) {
    throw new Error("useActiveSemester must be used within a SemestersProvider");
  }
  const { semesters, setSemesters } = context;

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const paramId = searchParams.get(PARAM);
  const storedId = typeof window === "undefined" ? null : window.localStorage.getItem(STORAGE_KEY);

  const activeSemester = useMemo(() => {
    if (!semesters) return null;
    return resolveActiveSemester(semesters, paramId ?? storedId);
  }, [semesters, paramId, storedId]);

  const setActiveSemester = useCallback(
    (id: number) => {
      window.localStorage.setItem(STORAGE_KEY, String(id));
      const params = new URLSearchParams(searchParams.toString());
      params.set(PARAM, String(id));
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  // The param can point at an id that turned out not to exist (deleted term,
  // link copied between accounts) — once semesters have loaded, normalize
  // the URL to what's actually being shown so it doesn't keep pointing at
  // a ghost id.
  useEffect(() => {
    if (!semesters || !activeSemester) return;
    if (paramId && Number(paramId) !== activeSemester.id) {
      setActiveSemester(activeSemester.id);
    }
  }, [semesters, activeSemester, paramId, setActiveSemester]);

  return {
    semesters: semesters ?? [],
    activeSemester,
    setActiveSemester,
    // Raw setter, for pages (like /semester's term manager) that create,
    // edit, or delete semesters locally and need to splice the change into
    // this hook's list without an extra round-trip fetch.
    mutateSemesters: setSemesters,
    loading: semesters === null,
  };
}
