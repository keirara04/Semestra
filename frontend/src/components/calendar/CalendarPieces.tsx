"use client";

import { useDraggable, useDroppable } from "@dnd-kit/core";
import type { CSSProperties, FormEvent, ReactNode } from "react";
import { blockTypeLabel, formatTime, isBlockDraggable } from "@/lib/calendar";
import type { CalendarBlock, Task } from "@/lib/types";

// Presentational pieces of the Calendar page (app/(app)/calendar/page.tsx)
// that don't close over its state — pulled out here purely to keep that
// file's size down; every one of these still only exists for that page.

// A pen-circled date, not a UI selection ring: today gets marked the way a
// student actually marks today on a paper planner, not highlighted the way
// a web app highlights a selected cell. Two overlapping, slightly
// mismatched arcs read as one imperfect hand-drawn loop, not a UI element.
export function TodayMark() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 44 30"
      className="pointer-events-none absolute -inset-x-2.5 -inset-y-1.5 h-[calc(100%+0.75rem)] w-[calc(100%+1.25rem)] -rotate-2 text-[var(--fn-oxide)]"
    >
      {/* Two overlapping, mismatched loops — a quick double-circle, the
          way a pen actually marks "today" on a paper planner, not one
          clean vector ellipse. */}
      <path
        d="M7 16C5 8 13 3 23 2.5C34 2 40 7 38.5 14C37 21 29 26 20 26.5C11 27 5 23 7.5 17"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity="0.9"
      />
      <path
        d="M9 14C8 9 15 4.5 24 5C32 5.5 38 10 37 15.5C36 20.5 28 24.5 19 24C13 23.7 8 20 8.5 15"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        opacity="0.55"
      />
    </svg>
  );
}

// Shared by the details popup and the Add/Edit form's footer — they used
// to diverge (details popup offered This/Following/All for a recurring
// block, the edit form silently deleted just "this" with no indication
// the block was part of a series at all).
export function DeleteBlockControls({
  block,
  onDelete,
}: {
  block: CalendarBlock;
  onDelete: (scope: "this" | "following" | "all") => void;
}) {
  if (block.recurrence_group_id === null) {
    return (
      <button type="button" onClick={() => onDelete("this")} className="text-sm text-[var(--fn-oxide)] underline underline-offset-2">
        Delete
      </button>
    );
  }

  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="text-[var(--fn-muted)]">Delete:</span>
      <button type="button" onClick={() => onDelete("this")} className="text-[var(--fn-oxide)] underline underline-offset-2">
        This
      </button>
      <button type="button" onClick={() => onDelete("following")} className="text-[var(--fn-oxide)] underline underline-offset-2">
        Following
      </button>
      <button type="button" onClick={() => onDelete("all")} className="text-[var(--fn-oxide)] underline underline-offset-2">
        All
      </button>
    </div>
  );
}

// dnd-kit requires each draggable to call useDraggable itself (hooks
// can't run inside a .map() body), so the block button is its own small
// component rather than inline JSX in the grid/timeline render.
export function DraggableBlock({
  block,
  onClick,
  className,
  style,
  displayTimezone,
  children,
}: {
  block: CalendarBlock;
  onClick: () => void;
  className: string;
  style?: CSSProperties;
  displayTimezone: string;
  children: ReactNode;
}) {
  const draggable = isBlockDraggable(block);
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `block:${block.id}`,
    data: { block },
    disabled: !draggable,
  });

  return (
    <button
      ref={setNodeRef}
      type="button"
      data-block-drag="true"
      onClick={onClick}
      style={{
        ...style,
        // Follow the pointer directly via CSS transform — no state
        // update, no re-render per pixel moved, which is what was
        // reading as a multi-second "stuck" drag before this fix: the
        // block sat frozen in place until drop because nothing was ever
        // translating it mid-drag.
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        zIndex: isDragging ? 50 : undefined,
        boxShadow: isDragging ? "0 6px 16px rgba(0,0,0,0.18)" : undefined,
      }}
      className={`group/block ${className}`}
      {...(draggable ? { ...listeners, ...attributes } : {})}
    >
      {children}
      {!isDragging && <BlockHoverPreview block={block} displayTimezone={displayTimezone} />}
    </button>
  );
}

// Hover preview: pure CSS (group-hover + a transition-delay), not a JS
// timer/mouseenter state machine — cheaper, and immune to getting stuck
// mid-drag since there's no separate hover state to desync. The
// `(hover: hover)` media guard is what keeps this off touch devices: no
// real hover state there, so a tap goes straight to the onClick details
// popup, exactly as before this phase.
export function BlockHoverPreview({ block, displayTimezone }: { block: CalendarBlock; displayTimezone: string }) {
  return (
    <div
      role="tooltip"
      className="fn-block-preview pointer-events-none absolute left-1/2 top-full z-50 mt-1.5 hidden w-56 -translate-x-1/2 text-left opacity-0 transition-opacity delay-300 duration-150 [@media(hover:hover)]:block [@media(hover:hover)]:group-hover/block:opacity-100"
    >
      <p className="fn-eyebrow text-[10px]">{blockTypeLabel(block)}</p>
      <p className="mt-0.5 truncate text-sm font-semibold text-[var(--fn-ink)]">{block.title ?? "Study"}</p>
      <p className="fn-mono mt-1 text-xs text-[var(--fn-muted)]">
        {formatTime(block.start_at, displayTimezone)}–{formatTime(block.end_at, displayTimezone)}
      </p>
      {block.location && <p className="mt-1 truncate text-xs text-[var(--fn-muted)]">{block.location}</p>}
      {block.description && <p className="mt-1 line-clamp-2 text-xs text-[var(--fn-ink)]">{block.description}</p>}
    </div>
  );
}

// Drop target: a whole day cell (month view) or a single hour slot (week/
// day view) — same component either way, id encodes which.
export function DroppableZone({
  id,
  className,
  style,
  children,
}: {
  id: string;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div ref={setNodeRef} style={style} className={`${className ?? ""} ${isOver ? "fn-drop-target" : ""}`}>
      {children}
    </div>
  );
}

export interface BlockFormValues {
  title: string;
  type: "study" | "commitment";
  date: string;
  start_time: string;
  end_time: string;
  location: string;
  description: string;
  task_id: string;
  // Create-only ("repeat weekly until"): empty = one-off. Ignored by the
  // backend on an edit (CalendarBlockController strips it), so there's no
  // need to clear it when opening an existing block for editing.
  repeat_until: string;
}

export const EMPTY_BLOCK_FORM: BlockFormValues = {
  title: "",
  type: "study",
  date: "",
  start_time: "09:00",
  end_time: "10:00",
  location: "",
  description: "",
  task_id: "",
  repeat_until: "",
};

export function BlockForm({
  form,
  setForm,
  error,
  submitting,
  openTasks,
  isEditing,
  isRecurring,
  onSubmit,
  onCancel,
  deleteControls,
}: {
  form: BlockFormValues;
  setForm: (form: BlockFormValues) => void;
  error: string | null;
  submitting: boolean;
  openTasks: Task[];
  isEditing: boolean;
  isRecurring?: boolean;
  onSubmit: (event: FormEvent) => void;
  onCancel: () => void;
  deleteControls?: ReactNode;
}) {
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {isEditing && form.date && (
        <p className="fn-eyebrow">
          Editing block on {new Date(`${form.date}T00:00:00`).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
          {isRecurring && " · repeats weekly"}
        </p>
      )}
      {/* What */}
      <label className="flex flex-col gap-1.5">
        <span className="fn-label">What</span>
        <input
          autoFocus
          value={form.title}
          onChange={(event) => setForm({ ...form, title: event.target.value })}
          className="fn-input"
          placeholder="Study session"
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="fn-label">Type</span>
        <select
          value={form.type}
          onChange={(event) => setForm({ ...form, type: event.target.value as BlockFormValues["type"] })}
          className="fn-input"
        >
          <option value="study">Study</option>
          <option value="commitment">Commitment</option>
        </select>
      </label>

      {/* When */}
      <label className="flex flex-col gap-1.5">
        <span className="fn-label">When</span>
        <input
          type="date"
          value={form.date}
          onChange={(event) => setForm({ ...form, date: event.target.value })}
          required
          className="fn-input"
        />
      </label>
      <div className="flex gap-3">
        <label className="flex flex-1 flex-col gap-1.5">
          <span className="fn-label">Start time</span>
          <input
            type="time"
            value={form.start_time}
            onChange={(event) => setForm({ ...form, start_time: event.target.value })}
            required
            className="fn-input"
          />
        </label>
        <label className="flex flex-1 flex-col gap-1.5">
          <span className="fn-label">End time</span>
          <input
            type="time"
            value={form.end_time}
            onChange={(event) => setForm({ ...form, end_time: event.target.value })}
            required
            className="fn-input"
          />
        </label>
      </div>

      {!isEditing && (
        <label className="flex flex-col gap-1.5">
          <span className="fn-label">Repeat weekly until (optional)</span>
          <input
            type="date"
            value={form.repeat_until}
            min={form.date || undefined}
            onChange={(event) => setForm({ ...form, repeat_until: event.target.value })}
            className="fn-input"
          />
        </label>
      )}

      {/* Where */}
      <label className="flex flex-col gap-1.5">
        <span className="fn-label">Where (optional)</span>
        <input
          value={form.location}
          onChange={(event) => setForm({ ...form, location: event.target.value })}
          className="fn-input"
          placeholder="Library, room 204…"
        />
      </label>

      {/* Description */}
      <label className="flex flex-col gap-1.5">
        <span className="fn-label">Description (optional)</span>
        <textarea
          value={form.description}
          onChange={(event) => setForm({ ...form, description: event.target.value })}
          className="fn-input"
          rows={3}
          placeholder="What you're planning to work on…"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="fn-label">Task (optional)</span>
        <select
          value={form.task_id}
          onChange={(event) => setForm({ ...form, task_id: event.target.value })}
          className="fn-input"
        >
          <option value="">No task</option>
          {openTasks.map((task) => (
            <option key={task.id} value={task.id}>
              {task.title}
            </option>
          ))}
        </select>
      </label>

      {error && (
        <p role="alert" className="text-sm text-[var(--fn-oxide)]">
          {error}
        </p>
      )}

      <div className="flex items-center gap-2">
        <button type="submit" disabled={submitting} className="fn-btn-primary !w-fit px-4">
          {submitting ? "Saving…" : isEditing ? "Save" : "Add block"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-[var(--fn-rule)] px-4 text-sm hover:bg-[var(--fn-canvas)]"
        >
          Cancel
        </button>
        {isEditing && deleteControls && <div className="ml-auto">{deleteControls}</div>}
      </div>
    </form>
  );
}
