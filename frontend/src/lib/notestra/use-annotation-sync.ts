"use client";

import { useCallback, useRef, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import type { Annotation } from "@/lib/types";
import { useDebouncedCallback } from "@/lib/hooks/use-debounced-callback";

export type SaveState = "saved" | "dirty" | "saving" | "error";

type UndoAction = { id: string; before: Annotation | null; after: Annotation | null };

interface SyncResponse {
  synced: { id: string; updated_at: string }[];
}

const AUTOSAVE_DELAY_MS = 1500;

// Dirty-set tracking + batched autosave + local undo/redo — see
// mdfile/NOTESTRA_FUNCTIONAL_SPEC.md, Sections 9 and 11. The save state
// machine is saved -> dirty -> saving -> saved/error; on error the dirty set
// is kept (never cleared) and the next debounce retries the same batch.
export function useAnnotationSync(materialId: number) {
  const [annotations, setAnnotations] = useState<Record<string, Annotation>>({});
  const [saveState, setSaveState] = useState<SaveState>("saved");

  const dirtyRef = useRef<Map<string, Annotation | { deleted: true }>>(new Map());
  const undoStack = useRef<UndoAction[]>([]);
  const redoStack = useRef<UndoAction[]>([]);
  // Mirrors the two stacks' lengths in state (refs can't be read during
  // render) so canUndo/canRedo stay accurate without re-deriving them from
  // the ref on every render.
  const [undoRedoCounts, setUndoRedoCounts] = useState({ undo: 0, redo: 0 });

  function syncUndoRedoCounts() {
    setUndoRedoCounts({ undo: undoStack.current.length, redo: redoStack.current.length });
  }

  function setInitial(list: Annotation[]) {
    const byId: Record<string, Annotation> = {};
    for (const annotation of list) byId[annotation.id] = annotation;
    setAnnotations(byId);
  }

  const flush = useCallback(async () => {
    if (dirtyRef.current.size === 0) return;

    setSaveState("saving");
    const entries = Array.from(dirtyRef.current.entries());
    const upsert = entries
      .filter(([, value]) => !("deleted" in value))
      .map(([id, value]) => {
        const annotation = value as Annotation;
        return {
          id,
          page_number: annotation.page_number,
          type: annotation.type,
          data: annotation.data,
          updated_at: annotation.updated_at,
        };
      });
    const deleteIds = entries.filter(([, value]) => "deleted" in value).map(([id]) => id);

    try {
      const response = await apiFetch<SyncResponse>(`/api/materials/${materialId}/annotations`, {
        method: "PUT",
        body: JSON.stringify({ upsert, delete: deleteIds }),
      });

      for (const synced of response.synced) {
        dirtyRef.current.delete(synced.id);
        setAnnotations((prev) => {
          const existing = prev[synced.id];
          return existing ? { ...prev, [synced.id]: { ...existing, updated_at: synced.updated_at } } : prev;
        });
      }
      for (const id of deleteIds) dirtyRef.current.delete(id);

      setSaveState(dirtyRef.current.size > 0 ? "dirty" : "saved");
    } catch (err) {
      // Deliberately do not clear dirtyRef here — a failed autosave must
      // never silently drop the user's edits (spec Section 11).
      setSaveState("error");
      if (!(err instanceof ApiError)) throw err;
    }
  }, [materialId]);

  const debouncedFlush = useDebouncedCallback(flush, AUTOSAVE_DELAY_MS);

  function markDirty(id: string, value: Annotation | { deleted: true }) {
    dirtyRef.current.set(id, value);
    setSaveState("dirty");
    debouncedFlush();
  }

  function createAnnotation(annotation: Annotation) {
    const withMaterial = { ...annotation, material_id: materialId };
    setAnnotations((prev) => ({ ...prev, [withMaterial.id]: withMaterial }));
    markDirty(withMaterial.id, withMaterial);
    undoStack.current.push({ id: withMaterial.id, before: null, after: withMaterial });
    redoStack.current = [];
    syncUndoRedoCounts();
  }

  function updateAnnotation(annotation: Annotation) {
    const before = annotations[annotation.id] ?? null;
    setAnnotations((prev) => ({ ...prev, [annotation.id]: annotation }));
    markDirty(annotation.id, annotation);
    undoStack.current.push({ id: annotation.id, before, after: annotation });
    redoStack.current = [];
    syncUndoRedoCounts();
  }

  function deleteAnnotation(id: string) {
    const before = annotations[id] ?? null;
    setAnnotations((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    markDirty(id, { deleted: true });
    undoStack.current.push({ id, before, after: null });
    redoStack.current = [];
    syncUndoRedoCounts();
  }

  function applyAction(action: UndoAction, direction: "undo" | "redo") {
    const target = direction === "undo" ? action.before : action.after;
    if (target) {
      setAnnotations((prev) => ({ ...prev, [action.id]: target }));
      markDirty(action.id, target);
    } else {
      setAnnotations((prev) => {
        const next = { ...prev };
        delete next[action.id];
        return next;
      });
      markDirty(action.id, { deleted: true });
    }
  }

  function undo() {
    const action = undoStack.current.pop();
    if (!action) return;
    applyAction(action, "undo");
    redoStack.current.push(action);
    syncUndoRedoCounts();
  }

  function redo() {
    const action = redoStack.current.pop();
    if (!action) return;
    applyAction(action, "redo");
    undoStack.current.push(action);
    syncUndoRedoCounts();
  }

  return {
    annotations: Object.values(annotations),
    setInitial,
    saveState,
    createAnnotation,
    updateAnnotation,
    deleteAnnotation,
    undo,
    redo,
    canUndo: undoRedoCounts.undo > 0,
    canRedo: undoRedoCounts.redo > 0,
    retry: flush,
  };
}
