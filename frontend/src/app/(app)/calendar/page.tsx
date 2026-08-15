"use client";

import { useEffect, useState, type FormEvent } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import type { CalendarBlock, DayCapacity, Semester, Task } from "@/lib/types";
import { WeekStateMarker, weekState } from "@/components/WeekState";
import { pickCurrentSemester } from "@/lib/semester";
import { formatMinutes } from "@/lib/format";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function startOfWeek(date: Date): Date {
  const day = date.getDay();
  const start = new Date(date);
  start.setDate(date.getDate() - day);
  start.setHours(0, 0, 0, 0);
  return start;
}

function startOfMonth(date: Date): Date {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  start.setHours(0, 0, 0, 0);
  return start;
}

function endOfMonth(date: Date): Date {
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  end.setHours(0, 0, 0, 0);
  return end;
}

function addDays(date: Date, amount: number): Date {
  const next = new Date(date);
  next.setDate(date.getDate() + amount);
  return next;
}

// Grid always covers full weeks (Sun–Sat) so the month renders as a clean rectangle.
function monthGridDays(monthAnchor: Date): Date[] {
  const gridStart = startOfWeek(startOfMonth(monthAnchor));
  const gridEnd = startOfWeek(endOfMonth(monthAnchor));
  const days: Date[] = [];
  for (let d = gridStart; d <= addDays(gridEnd, 6); d = addDays(d, 1)) {
    days.push(d);
  }
  return days;
}

function toDateParam(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function isToday(dateString: string): boolean {
  return dateString === toDateParam(new Date());
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function monthLabel(monthAnchor: Date): string {
  return monthAnchor.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function weekChunks<T>(items: T[]): T[][] {
  const weeks: T[][] = [];
  for (let i = 0; i < items.length; i += 7) weeks.push(items.slice(i, i + 7));
  return weeks;
}

// A pen-circled date, not a UI selection ring: today gets marked the way a
// student actually marks today on a paper planner, not highlighted the way
// a web app highlights a selected cell. Two overlapping, slightly
// mismatched arcs read as one imperfect hand-drawn loop, not a UI element.
function TodayMark() {
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

// Suggested blocks get a dashed outline, committed (accepted/moved/done)
// blocks a solid one: the distinction between "the plan suggested this"
// and "you committed to this" is load-bearing for trust, per "Calendar
// view" in mdfile/DESIGN.md.
function blockStyle(status: CalendarBlock["status"]): string {
  if (status === "suggested") {
    return "border border-dashed border-[var(--fn-cobalt)] text-[var(--fn-cobalt)]";
  }
  if (status === "skipped") {
    return "border border-[var(--fn-rule)] text-[var(--fn-muted)] line-through";
  }
  return "border border-[var(--fn-cobalt)] bg-[var(--fn-cobalt)]/10 text-[var(--fn-cobalt)]";
}

interface BlockFormValues {
  title: string;
  type: "study" | "commitment";
  date: string;
  start_time: string;
  end_time: string;
  location: string;
  description: string;
  task_id: string;
}

const EMPTY_BLOCK_FORM: BlockFormValues = {
  title: "",
  type: "study",
  date: "",
  start_time: "09:00",
  end_time: "10:00",
  location: "",
  description: "",
  task_id: "",
};

function BlockForm({
  form,
  setForm,
  error,
  submitting,
  openTasks,
  isEditing,
  onSubmit,
  onCancel,
  onDelete,
}: {
  form: BlockFormValues;
  setForm: (form: BlockFormValues) => void;
  error: string | null;
  submitting: boolean;
  openTasks: Task[];
  isEditing: boolean;
  onSubmit: (event: FormEvent) => void;
  onCancel: () => void;
  onDelete?: () => void;
}) {
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {isEditing && form.date && (
        <p className="fn-eyebrow">
          Editing block on {new Date(`${form.date}T00:00:00`).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
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
        {isEditing && onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="ml-auto text-sm text-[var(--fn-oxide)] underline underline-offset-2"
          >
            Delete
          </button>
        )}
      </div>
    </form>
  );
}

// Calendar month grid, see "Calendar view" in mdfile/DESIGN.md.
export default function CalendarPage() {
  const [monthAnchor, setMonthAnchor] = useState(() => startOfMonth(new Date()));
  const [days, setDays] = useState<DayCapacity[] | null>(null);
  const [blocks, setBlocks] = useState<CalendarBlock[]>([]);
  const [semester, setSemester] = useState<Semester | null>(null);
  const [running, setRunning] = useState(false);
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const [openTasks, setOpenTasks] = useState<Task[]>([]);
  const [editingBlockId, setEditingBlockId] = useState<number | "new" | null>(null);
  const [detailsBlockId, setDetailsBlockId] = useState<number | null>(null);

  useEffect(() => {
    if (editingBlockId === null && detailsBlockId === null) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setEditingBlockId(null);
      setDetailsBlockId(null);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [editingBlockId, detailsBlockId]);
  const [blockForm, setBlockForm] = useState<BlockFormValues>(EMPTY_BLOCK_FORM);
  const [blockFormError, setBlockFormError] = useState<string | null>(null);
  const [blockFormSubmitting, setBlockFormSubmitting] = useState(false);

  const gridDays = monthGridDays(monthAnchor);

  function load() {
    const gridStart = gridDays[0];
    const gridEnd = gridDays[gridDays.length - 1];

    apiFetch<DayCapacity[]>(
      `/api/calendar/capacity?from=${toDateParam(gridStart)}&to=${toDateParam(gridEnd)}`,
    ).then(setDays);
    apiFetch<CalendarBlock[]>("/api/calendar-blocks").then(setBlocks);
  }

  useEffect(load, [monthAnchor]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    apiFetch<Semester[]>("/api/semesters").then((list) => setSemester(pickCurrentSemester(list)));
  }, []);

  useEffect(() => {
    apiFetch<Task[]>("/api/tasks").then((list) => setOpenTasks(list.filter((t) => t.status === "open")));
  }, []);

  function shiftMonth(delta: number) {
    setMonthAnchor((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));
  }

  async function runPlanner() {
    setRunning(true);
    try {
      await apiFetch("/api/planning/run", { method: "POST" });
      load();
    } finally {
      setRunning(false);
    }
  }

  async function updateStatus(block: CalendarBlock, status: CalendarBlock["status"]) {
    const updated = await apiFetch<CalendarBlock>(`/api/calendar-blocks/${block.id}`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    });
    setBlocks((current) => current.map((b) => (b.id === block.id ? updated : b)));
  }

  function startCreate(defaultDate?: string) {
    setEditingBlockId("new");
    setBlockForm({ ...EMPTY_BLOCK_FORM, date: defaultDate ?? toDateParam(new Date()) });
    setBlockFormError(null);
  }

  function startEdit(block: CalendarBlock) {
    setEditingBlockId(block.id);
    setBlockForm({
      title: block.title ?? "",
      type: block.type === "commitment" ? "commitment" : "study",
      date: block.start_at.slice(0, 10),
      start_time: block.start_at.slice(11, 16),
      end_time: block.end_at.slice(11, 16),
      location: block.location ?? "",
      description: block.description ?? "",
      task_id: block.task_id ? String(block.task_id) : "",
    });
    setBlockFormError(null);
  }

  function cancelBlockForm() {
    setEditingBlockId(null);
    setBlockFormError(null);
  }

  // Never sends `status`, for create or edit: CalendarBlockRequest defaults
  // new rows to "accepted", and on update, if start_at/end_at change with no
  // explicit status, the controller auto-sets "moved" (unless already
  // "done") — that's the mechanism that stops a manual time-edit from being
  // silently reverted by the next planner run. Echoing status back here
  // would defeat it.
  async function submitBlock(event: FormEvent) {
    event.preventDefault();
    setBlockFormError(null);
    setBlockFormSubmitting(true);
    try {
      const body = {
        title: blockForm.title || null,
        type: blockForm.type,
        location: blockForm.location || null,
        description: blockForm.description || null,
        task_id: blockForm.task_id ? Number(blockForm.task_id) : null,
        start_at: `${blockForm.date}T${blockForm.start_time}`,
        end_at: `${blockForm.date}T${blockForm.end_time}`,
      };
      if (editingBlockId === "new") {
        const created = await apiFetch<CalendarBlock>("/api/calendar-blocks", {
          method: "POST",
          body: JSON.stringify(body),
        });
        setBlocks((current) => [...current, created]);
      } else if (editingBlockId !== null) {
        const updated = await apiFetch<CalendarBlock>(`/api/calendar-blocks/${editingBlockId}`, {
          method: "PUT",
          body: JSON.stringify(body),
        });
        setBlocks((current) => current.map((b) => (b.id === editingBlockId ? updated : b)));
      }
      setEditingBlockId(null);
    } catch (err) {
      setBlockFormError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setBlockFormSubmitting(false);
    }
  }

  async function deleteBlock(block: CalendarBlock): Promise<boolean> {
    if (!window.confirm(`Delete "${block.title ?? "this block"}"? This can't be undone.`)) return false;
    await apiFetch(`/api/calendar-blocks/${block.id}`, { method: "DELETE" });
    setBlocks((current) => current.filter((b) => b.id !== block.id));
    return true;
  }

  const weeks = weekChunks(gridDays);
  const detailsBlock = blocks.find((b) => b.id === detailsBlockId) ?? null;

  return (
    <main className="relative bg-[var(--fn-paper)] min-h-dvh w-full px-8 py-10 md:pr-12 md:pl-24">
      {/* Ring-binder margin: an oxide rule + three punched holes, the
          same "notebook margin" motif the system already defines
          (.fn-margin in globals.css) but built locally against this
          block's own content height rather than a viewport-fixed
          overlay, since that class is meant for full-page use. This is
          the page's one signature move — the calendar reads as a loose
          leaf in a binder, not a boxed dashboard grid. */}
      <div className="pointer-events-none absolute top-10 bottom-10 left-12 hidden w-px bg-[var(--fn-oxide)] opacity-50 md:block" aria-hidden="true">
        {[0.12, 0.5, 0.88].map((position) => (
          <span
            key={position}
            className="absolute left-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[var(--fn-rule)] bg-[var(--fn-canvas)]"
            style={{ top: `${position * 100}%` }}
          />
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="fn-eyebrow">{semester?.name ?? "Calendar"}</p>
          <h1 className="mt-1 text-2xl font-semibold">{monthLabel(monthAnchor)}</h1>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => (editingBlockId === null ? startCreate() : cancelBlockForm())}
            aria-label={editingBlockId === null ? "Add block" : "Hide add block form"}
            title={editingBlockId === null ? "Add block" : "Hide"}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--fn-cobalt)] text-lg leading-none text-[var(--fn-paper)] hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--fn-cobalt)]"
          >
            {editingBlockId === null ? "+" : "×"}
          </button>
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            className="rounded-md border border-[var(--fn-rule)] px-3 py-1.5 text-sm hover:bg-[var(--fn-canvas)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--fn-cobalt)]"
          >
            ← Prev
          </button>
          <button
            type="button"
            onClick={() => setMonthAnchor(startOfMonth(new Date()))}
            className="rounded-md border border-[var(--fn-rule)] px-3 py-1.5 text-sm hover:bg-[var(--fn-canvas)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--fn-cobalt)]"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            className="rounded-md border border-[var(--fn-rule)] px-3 py-1.5 text-sm hover:bg-[var(--fn-canvas)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--fn-cobalt)]"
          >
            Next →
          </button>
          <button
            type="button"
            onClick={runPlanner}
            disabled={running}
            className="fn-btn-primary !w-fit px-3 py-1.5 text-sm"
          >
            {running ? "Planning…" : "Replan"}
          </button>
        </div>
      </div>

      {/* Ruled like notebook paper: a horizontal rule between weeks,
          no boxed cells and no vertical gridlines — the grid comes from
          column alignment, not table borders. This is the deliberate
          departure from the generic "SaaS calendar" boxed-grid default. */}
      <div className="fn-mono mt-8 grid grid-cols-7 text-center text-[11px] tracking-widest text-[var(--fn-muted)]">
        {DAYS.map((label) => (
          <div key={label} className="pb-2">
            {label.toUpperCase()}
          </div>
        ))}
      </div>
      <div className="border-t border-[var(--fn-rule)]">
      {weeks.map((week, weekIndex) => (
        <div
          key={weekIndex}
          className={`grid grid-cols-7 ${weekIndex < weeks.length - 1 ? "border-b border-[var(--fn-rule)]" : ""}`}
        >
        {week.map((cellDate) => {
          const dateParam = toDateParam(cellDate);
          const day = days?.find((d) => d.date === dateParam);
          const inMonth = cellDate.getMonth() === monthAnchor.getMonth();
          const dayBlocks = blocks.filter((b) => b.start_at.slice(0, 10) === dateParam && b.status !== "skipped");
          const plannedMinutes = dayBlocks
            .filter((b) => b.status !== "suggested")
            .reduce((sum, b) => sum + (new Date(b.end_at).getTime() - new Date(b.start_at).getTime()) / 60_000, 0);
          const state = day ? weekState(plannedMinutes, day.recommended_study_minutes) : null;
          // Matches the plan's own example capacity-readout format, see
          // "Calendar view" in mdfile/DESIGN.md — same three-number
          // shape as the semester map's day tooltip, just phrased for
          // lectures/available/planned instead of course breakdown.
          const capacityReadout = day
            ? `Lectures ${formatMinutes(day.lecture_minutes)} · Available ${formatMinutes(day.available_minutes)} · Planned ${formatMinutes(plannedMinutes)}`
            : undefined;
          const isExpanded = expandedDays.has(dateParam);
          const visibleBlocks = isExpanded ? dayBlocks : dayBlocks.slice(0, 3);
          const hiddenCount = dayBlocks.length - visibleBlocks.length;

          return (
            <div
              key={dateParam}
              className={`flex min-h-28 flex-col gap-1 border-r border-[var(--fn-rule)]/40 p-2 last:border-r-0 ${
                inMonth ? "" : "opacity-40"
              }`}
            >
              <div className="flex items-baseline justify-between" title={capacityReadout}>
                {inMonth ? (
                  <span className="relative inline-block">
                    {isToday(dateParam) && <TodayMark />}
                    <button
                      type="button"
                      onClick={() => startCreate(dateParam)}
                      className="fn-mono relative text-xs text-[var(--fn-muted)] hover:text-[var(--fn-cobalt)] hover:underline"
                    >
                      {cellDate.getDate()}
                    </button>
                  </span>
                ) : (
                  <span className="fn-mono text-xs text-[var(--fn-muted)]">{cellDate.getDate()}</span>
                )}
                {day && !day.is_break && state && <WeekStateMarker state={state} />}
              </div>
              {day?.is_break && <span className="fn-mono text-[11px] text-[var(--fn-muted)]">Break</span>}

              {dayBlocks.length > 0 && (
                <div className="flex flex-col gap-1">
                  {visibleBlocks.map((block) => (
                    <button
                      key={block.id}
                      type="button"
                      onClick={() => setDetailsBlockId(block.id)}
                      className={`flex w-full flex-col gap-0.5 rounded px-1.5 py-1 text-left text-[11px] hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--fn-cobalt)] ${blockStyle(block.status)}`}
                    >
                      <span className="truncate font-medium">{block.title ?? "Study"}</span>
                      <span className="fn-mono">
                        {formatTime(block.start_at)}–{formatTime(block.end_at)}
                      </span>
                    </button>
                  ))}
                  {hiddenCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setExpandedDays((current) => new Set(current).add(dateParam))}
                      className="fn-mono text-left text-[11px] text-[var(--fn-cobalt)] underline underline-offset-2"
                    >
                      +{hiddenCount} more
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
        </div>
      ))}
      </div>

      {editingBlockId !== null && (
        <div
          className="fn-popup-backdrop fixed inset-0 z-40 flex items-center justify-center bg-black/30 p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) cancelBlockForm();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={editingBlockId === "new" ? "Add block" : "Edit block"}
            className="fn-popup-card max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg border border-[var(--fn-rule)] bg-[var(--fn-paper)] p-6 shadow-xl"
          >
            <div className="flex items-center justify-between">
              <p className="fn-eyebrow">{editingBlockId === "new" ? "Add block" : "Edit block"}</p>
              <button
                type="button"
                onClick={cancelBlockForm}
                aria-label="Close"
                className="fn-mono text-lg leading-none text-[var(--fn-muted)] hover:text-[var(--fn-ink)]"
              >
                ×
              </button>
            </div>
            <div className="mt-4">
              <BlockForm
                form={blockForm}
                setForm={setBlockForm}
                error={blockFormError}
                submitting={blockFormSubmitting}
                openTasks={openTasks}
                isEditing={editingBlockId !== "new"}
                onSubmit={submitBlock}
                onCancel={cancelBlockForm}
                onDelete={
                  editingBlockId !== "new"
                    ? () => {
                        const block = blocks.find((b) => b.id === editingBlockId);
                        if (block) deleteBlock(block).then((deleted) => deleted && cancelBlockForm());
                      }
                    : undefined
                }
              />
            </div>
          </div>
        </div>
      )}

      {/* Block details: click a block to see its full info; Edit/Delete
          only ever show up in here, never sitting exposed on the card
          itself. */}
      {detailsBlock && (
        <div
          className="fn-popup-backdrop fixed inset-0 z-40 flex items-center justify-center bg-black/30 p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) setDetailsBlockId(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={detailsBlock.title ?? "Block details"}
            className="fn-popup-card w-full max-w-md rounded-lg border border-[var(--fn-rule)] bg-[var(--fn-paper)] p-6 shadow-xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="fn-eyebrow">{detailsBlock.type === "lecture" ? "Lecture" : detailsBlock.status === "suggested" ? "Suggested" : "Block"}</p>
                <h2 className="mt-1 text-lg font-semibold">{detailsBlock.title ?? "Study"}</h2>
              </div>
              <button
                type="button"
                onClick={() => setDetailsBlockId(null)}
                aria-label="Close"
                className="fn-mono text-lg leading-none text-[var(--fn-muted)] hover:text-[var(--fn-ink)]"
              >
                ×
              </button>
            </div>

            <dl className="fn-mono mt-4 flex flex-col gap-2 text-sm">
              <div className="flex gap-2">
                <dt className="w-20 shrink-0 text-[var(--fn-muted)]">When</dt>
                <dd>
                  {new Date(detailsBlock.start_at).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                  {" · "}
                  {formatTime(detailsBlock.start_at)}–{formatTime(detailsBlock.end_at)}
                </dd>
              </div>
              {detailsBlock.location && (
                <div className="flex gap-2">
                  <dt className="w-20 shrink-0 text-[var(--fn-muted)]">Where</dt>
                  <dd>{detailsBlock.location}</dd>
                </div>
              )}
              {detailsBlock.description && (
                <div className="flex gap-2">
                  <dt className="w-20 shrink-0 text-[var(--fn-muted)]">Notes</dt>
                  <dd className="whitespace-pre-wrap">{detailsBlock.description}</dd>
                </div>
              )}
            </dl>

            <div className="mt-6 flex items-center gap-3">
              {detailsBlock.status === "suggested" && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      updateStatus(detailsBlock, "accepted");
                      setDetailsBlockId(null);
                    }}
                    className="fn-btn-primary !w-fit px-4"
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      updateStatus(detailsBlock, "skipped");
                      setDetailsBlockId(null);
                    }}
                    className="rounded-md border border-[var(--fn-rule)] px-4 py-2 text-sm hover:bg-[var(--fn-canvas)]"
                  >
                    Skip
                  </button>
                </>
              )}
              {detailsBlock.status !== "suggested" && detailsBlock.type !== "lecture" && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setDetailsBlockId(null);
                      startEdit(detailsBlock);
                    }}
                    className="rounded-md border border-[var(--fn-rule)] px-4 py-2 text-sm hover:bg-[var(--fn-canvas)]"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      deleteBlock(detailsBlock).then((deleted) => deleted && setDetailsBlockId(null));
                    }}
                    className="text-sm text-[var(--fn-oxide)] underline underline-offset-2"
                  >
                    Delete
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Legend: same "explain every symbol once, in one place" rule the semester map's legend follows. */}
      <div className="fn-mono mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-[var(--fn-rule)] pt-4 text-xs tracking-wide text-[var(--fn-ink)]">
        <span className="flex items-center gap-2">
          <span className="h-3 w-3 rounded border border-dashed border-[var(--fn-cobalt)]" /> SUGGESTED
        </span>
        <span className="flex items-center gap-2">
          <span className="h-3 w-3 rounded border border-[var(--fn-cobalt)] bg-[var(--fn-cobalt)]/10" /> COMMITTED
        </span>
        <span className="flex items-center gap-2">
          <span className="h-3 w-3 rounded border border-[var(--fn-rule)] text-[var(--fn-muted)] line-through" /> SKIPPED
        </span>
        <span className="flex items-center gap-2">
          <WeekStateMarker state="busy" /> BUSY / AT RISK / CRITICAL
        </span>
        <span className="flex items-center gap-2">
          <span className="relative inline-block h-4 w-6">
            <TodayMark />
          </span>{" "}
          TODAY
        </span>
      </div>
    </main>
  );
}
