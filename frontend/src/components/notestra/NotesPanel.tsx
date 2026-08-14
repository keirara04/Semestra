"use client";

import { useEffect, useState, type FormEvent } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import type { MaterialNote, NoteType } from "@/lib/types";

const NOTE_TYPES: NoteType[] = ["general", "exam", "concept", "question", "formula"];

interface NotesPanelProps {
  materialId: number;
  currentPage: number;
}

// Notes stay on individual create/update/delete requests, unlike batched
// annotations — they're user-initiated one-at-a-time actions, not
// high-frequency stroke data. See mdfile/NOTESTRA_FUNCTIONAL_SPEC.md,
// Section 19.
export function NotesPanel({ materialId, currentPage }: NotesPanelProps) {
  const [notes, setNotes] = useState<MaterialNote[] | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [noteType, setNoteType] = useState<NoteType>("general");
  const [attachToPage, setAttachToPage] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<MaterialNote[]>(`/api/materials/${materialId}/notes`).then(setNotes);
  }, [materialId]);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const created = await apiFetch<MaterialNote>(`/api/materials/${materialId}/notes`, {
        method: "POST",
        body: JSON.stringify({
          title,
          content,
          note_type: noteType,
          page_number: attachToPage ? currentPage : null,
        }),
      });
      setNotes((prev) => [...(prev ?? []), created]);
      setTitle("");
      setContent("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save note.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(note: MaterialNote) {
    await apiFetch(`/api/notes/${note.id}`, { method: "DELETE" });
    setNotes((prev) => (prev ?? []).filter((n) => n.id !== note.id));
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={handleCreate} className="flex flex-col gap-2">
        <input
          className="fn-input"
          placeholder="Note title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          required
        />
        <textarea
          className="fn-input"
          placeholder="Content"
          value={content}
          onChange={(event) => setContent(event.target.value)}
          rows={3}
          required
        />
        <div className="flex items-center gap-2">
          <select
            className="fn-input"
            value={noteType}
            onChange={(event) => setNoteType(event.target.value as NoteType)}
          >
            {NOTE_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <label className="fn-label flex items-center gap-1 text-xs">
            <input
              type="checkbox"
              checked={attachToPage}
              onChange={(event) => setAttachToPage(event.target.checked)}
            />
            Page {currentPage}
          </label>
        </div>
        {error && (
          <p role="alert" className="text-sm text-[var(--fn-oxide)]">
            {error}
          </p>
        )}
        <button type="submit" className="fn-btn-primary" disabled={submitting}>
          {submitting ? "Saving…" : "Add note"}
        </button>
      </form>

      <ul className="flex flex-col gap-2">
        {(notes ?? []).map((note) => (
          <li key={note.id} className="border-b pb-2" style={{ borderColor: "var(--fn-rule)" }}>
            <div className="flex items-center justify-between">
              <span className="fn-eyebrow">{note.note_type}</span>
              {note.page_number && (
                <span className="fn-mono text-xs text-[var(--fn-muted)]">p.{note.page_number}</span>
              )}
            </div>
            <p className="font-medium">{note.title}</p>
            <p className="text-sm text-[var(--fn-muted)]">{note.content}</p>
            <button
              type="button"
              onClick={() => handleDelete(note)}
              className="text-xs text-[var(--fn-oxide)]"
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
