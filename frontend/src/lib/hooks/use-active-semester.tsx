"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import { resolveActiveSemester } from "@/lib/semester";
import type { Semester } from "@/lib/types";

const STORAGE_KEY = "semestra:active-semester";
const PARAM = "semester";

/**
 * Owns the "which semester is the user looking at" question for every page
 * that needs it. Source of truth is the `?semester=<id>` URL param so a
 * non-current semester view is deep-linkable and survives reload; when the
 * param is absent, falls back to the last semester picked on any page
 * (localStorage), then to pickCurrentSemester. An id that no longer exists
 * (deleted term, stale link) is silently dropped rather than erroring.
 *
 * Dashboard, calendar, courses, semester, and TimetableWidget (nested
 * inside dashboard) all call this — React Query's cache is what keeps that
 * to one shared "/api/semesters" request instead of five independent ones:
 * every call site uses the same qk.semesters.all key, so they read from
 * (and revalidate) a single cache entry rather than each firing its own
 * fetch-on-mount.
 */
export function useActiveSemester() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { data: semesters } = useQuery({
    queryKey: qk.semesters.all,
    queryFn: () => apiFetch<Semester[]>("/api/semesters"),
  });

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

  const mutateSemesters = useCallback(
    (updater: Semester[] | ((current: Semester[]) => Semester[])) => {
      queryClient.setQueryData(qk.semesters.all, (current: Semester[] | undefined) =>
        typeof updater === "function" ? updater(current ?? []) : updater,
      );
    },
    [queryClient],
  );

  return {
    semesters: semesters ?? [],
    activeSemester,
    setActiveSemester,
    // For pages (like /semester's term manager) that create, edit, or
    // delete semesters locally and want to splice the change into the
    // cache without an extra round-trip fetch.
    mutateSemesters,
    loading: semesters === undefined,
  };
}
