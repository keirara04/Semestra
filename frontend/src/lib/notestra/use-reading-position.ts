"use client";

import { useEffect, useRef } from "react";
import { apiFetch } from "@/lib/api";
import type { UserMaterialState } from "@/lib/types";
import { useDebouncedCallback } from "@/lib/hooks/use-debounced-callback";

const STATE_SAVE_DELAY_MS = 1000;

// Restores last page/zoom on open and persists changes — see
// mdfile/NOTESTRA_FUNCTIONAL_SPEC.md, Section 15. onRestore fires directly
// from the fetch callback (not a derived effect keyed on a "restored" piece
// of state) since it's the async-external-system-update case the
// react-hooks setState-in-effect rule expects.
export function useReadingPosition(materialId: number, onRestore: (page: number, zoom: number) => void) {
  const loadedRef = useRef(false);
  const onRestoreRef = useRef(onRestore);
  useEffect(() => {
    onRestoreRef.current = onRestore;
  }, [onRestore]);

  useEffect(() => {
    loadedRef.current = false;
    apiFetch<UserMaterialState>(`/api/materials/${materialId}/state`).then((state) => {
      onRestoreRef.current(state.last_page ?? 1, state.zoom ? Number(state.zoom) : 1);
      loadedRef.current = true;
    });
  }, [materialId]);

  const debouncedSave = useDebouncedCallback((page: number, zoom: number) => {
    if (!loadedRef.current) return; // don't overwrite server state before the initial GET resolves
    apiFetch(`/api/materials/${materialId}/state`, {
      method: "PUT",
      body: JSON.stringify({ last_page: page, zoom }),
    });
  }, STATE_SAVE_DELAY_MS);

  return { savePosition: debouncedSave };
}
