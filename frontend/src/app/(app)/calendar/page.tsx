"use client";

import {
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { Check, ChevronLeft, ChevronRight, PenLine, Plus, RefreshCw, Search, X } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import type { CalendarBlock, ClassSession, DayCapacity, Task } from "@/lib/types";
import { WeekStateMarker, weekState } from "@/components/WeekState";
import { useActiveSemester } from "@/lib/hooks/use-active-semester";
import { formatMinutes } from "@/lib/format";
import {
  TIMELINE_START_HOUR,
  HOUR_HEIGHT_PX,
  timelineHours,
  hourLabel,
  occurrenceStyle,
  occurrenceTimelinePosition,
  type CalendarOccurrence,
} from "@/lib/timeline";
import {
  DAYS,
  REMINDER_PRESETS,
  TIMEZONE_OPTIONS,
  startOfWeek,
  startOfMonth,
  addDays,
  monthGridDays,
  toDateParam,
  isToday,
  formatTime,
  viewLabel,
  systemTimezone,
  monthMorphClass,
  weekChunks,
  blockStyle,
  blockTypeLabel,
  isBlockDraggable,
  timelineBlockPosition,
  minutesFromTimelineOffset,
  minutesToTime,
  layoutDayBlocks,
  type CalendarView,
  type PlanSuggestionDay,
  type PlanSuggestionItem,
} from "@/lib/calendar";
import {
  TodayMark,
  DeleteBlockControls,
  DraggableBlock,
  DroppableZone,
  BlockForm,
  EMPTY_BLOCK_FORM,
  type BlockFormValues,
} from "@/components/calendar/CalendarPieces";

// Calendar month grid, see "Calendar view" in mdfile/DESIGN.md.
export default function CalendarPage() {
  return (
    <Suspense fallback={null}>
      <CalendarPageInner />
    </Suspense>
  );
}

function CalendarPageInner() {
  const [view, setView] = useState<CalendarView>("month");
  // "Week view (default on desktop) ... Day view (default on mobile,
  // reachable from week view by tapping a day)" — DESIGN.md's "Calendar
  // view". A 7-column month grid on a phone-width screen is unreadable;
  // this runs post-mount (not in the useState initializer) so server and
  // first client render still agree and don't hydration-mismatch.
  const mobileViewInitialized = useRef(false);
  const [anchorDate, setAnchorDate] = useState(() => startOfMonth(new Date()));
  const queryClient = useQueryClient();
  const { activeSemester: semester } = useActiveSemester();
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const [editingBlockId, setEditingBlockId] = useState<number | "new" | null>(null);
  const [detailsBlockId, setDetailsBlockId] = useState<number | null>(null);
  const [editingDescription, setEditingDescription] = useState(false);
  const [descriptionDraft, setDescriptionDraft] = useState("");
  const [savingDescription, setSavingDescription] = useState(false);
  // Reminder is offered alongside the note being written, not as its own
  // standalone control — checking it commits together with whatever's in
  // the textarea on Save, per the "reminder based on the note" flow.
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderMinutes, setReminderMinutes] = useState(15);
  // Occurrences (class timetable / recurring commitments) are virtual —
  // they don't carry a CalendarBlock id, so their "details" state is the
  // occurrence itself, not a lookup by id like detailsBlockId.
  const [detailsOccurrence, setDetailsOccurrence] = useState<CalendarOccurrence | null>(null);
  const [editingOccurrenceDescription, setEditingOccurrenceDescription] = useState(false);
  const [occurrenceDescriptionDraft, setOccurrenceDescriptionDraft] = useState("");
  const [savingOccurrenceDescription, setSavingOccurrenceDescription] = useState(false);
  const [occurrenceReminderEnabled, setOccurrenceReminderEnabled] = useState(false);
  const [occurrenceReminderMinutes, setOccurrenceReminderMinutes] = useState(15);
  const [occurrenceReminderRecurring, setOccurrenceReminderRecurring] = useState(false);
  const [suggestions, setSuggestions] = useState<PlanSuggestionDay[] | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);
  const [navDirection, setNavDirection] = useState<1 | -1 | 0>(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [displayTimezone, setDisplayTimezone] = useState(() => systemTimezone());
  const { data: googleStatus } = useQuery({
    queryKey: qk.googleCalendarStatus,
    queryFn: () => apiFetch<{ connected: boolean }>("/api/google-calendar/status"),
  });
  const googleConnected = googleStatus?.connected ?? false;
  const [googleSyncing, setGoogleSyncing] = useState(false);
  const [googleSynced, setGoogleSynced] = useState(false);

  useEffect(() => {
    if (mobileViewInitialized.current) return;
    mobileViewInitialized.current = true;
    if (window.matchMedia("(max-width: 767px)").matches) {
      // Deliberately deferred to post-mount (see comment on `view` above) —
      // matchMedia isn't available during SSR/first paint, so this can't be
      // a lazy useState initializer without hydration mismatch.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setView("day");
    }
  }, []);

  const anyPopupOpen = editingBlockId !== null || detailsBlockId !== null || detailsOccurrence !== null || suggestions !== null;

  // Selecting (or deselecting) a block/occurrence always starts its details
  // popup on the read-only view, never mid-edit from whatever the last
  // selection left behind — bundled into the same setter that changes the
  // selection itself, rather than a separate effect reacting to it.
  function selectBlock(id: number | null) {
    setDetailsBlockId(id);
    setEditingDescription(false);
    setDescriptionDraft("");
    setReminderEnabled(false);
    setReminderMinutes(15);
  }

  function selectOccurrence(occurrence: CalendarOccurrence | null) {
    setDetailsOccurrence(occurrence);
    setEditingOccurrenceDescription(false);
    setOccurrenceDescriptionDraft("");
    setOccurrenceReminderEnabled(false);
    setOccurrenceReminderMinutes(15);
    setOccurrenceReminderRecurring(false);
  }

  useEffect(() => {
    if (!anyPopupOpen) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setEditingBlockId(null);
      selectBlock(null);
      selectOccurrence(null);
      setSuggestions(null);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [anyPopupOpen]);

  // Global shortcuts — only when nothing else has the keyboard: no popup
  // open, and focus isn't sitting in a text field (search included).
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (anyPopupOpen) return;
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;

      if (event.key === "ArrowLeft") {
        shiftPeriod(-1);
      } else if (event.key === "ArrowRight") {
        shiftPeriod(1);
      } else if (event.key.toLowerCase() === "t") {
        setNavDirection(0);
        setAnchorDate(new Date());
      } else if (event.key.toLowerCase() === "m") {
        setView("month");
      } else if (event.key.toLowerCase() === "w") {
        setView("week");
      } else if (event.key.toLowerCase() === "d") {
        setView("day");
      } else if (event.key === "/") {
        event.preventDefault();
        setSearchOpen(true);
      } else {
        return;
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [anyPopupOpen, view]); // eslint-disable-line react-hooks/exhaustive-deps

  const [blockForm, setBlockForm] = useState<BlockFormValues>(EMPTY_BLOCK_FORM);
  const [blockFormError, setBlockFormError] = useState<string | null>(null);
  const [blockFormSubmitting, setBlockFormSubmitting] = useState(false);

  // Memoized, not recomputed inline: this feeds capacityRange's own
  // useMemo below, and an unmemoized array here would be a new reference
  // every render, defeating that memo and firing load()'s effect on
  // every render — the actual cause of the "Failed to fetch" storm
  // (rapid repeated fetches starving each other), not a network/CORS issue.
  const gridDays = useMemo(() => monthGridDays(anchorDate), [anchorDate]);
  const weekDays = useMemo(() => {
    const start = startOfWeek(anchorDate);
    return Array.from({ length: 7 }, (_, index) => addDays(start, index));
  }, [anchorDate]);

  // Range fetched for /api/calendar/capacity — month view wants the full
  // rendered grid (including the leading/trailing days from adjacent
  // months), week/day views only need their own narrower span.
  const capacityRange = useMemo(() => {
    if (view === "week") return [weekDays[0], weekDays[6]] as const;
    if (view === "day") return [anchorDate, anchorDate] as const;
    return [gridDays[0], gridDays[gridDays.length - 1]] as const;
  }, [view, weekDays, anchorDate, gridDays]);

  const [rangeStart, rangeEnd] = capacityRange;
  const rangeStartParam = toDateParam(rangeStart);
  const rangeEndParam = toDateParam(rangeEnd);

  const { data: days = null } = useQuery({
    queryKey: qk.calendarCapacity(rangeStartParam, rangeEndParam),
    queryFn: () => apiFetch<DayCapacity[]>(`/api/calendar/capacity?from=${rangeStartParam}&to=${rangeEndParam}`),
  });
  // Not range-scoped server-side (CalendarBlockController::index returns
  // everything the user owns) — filtered client-side per view below, and
  // reused as-is by search, which needs blocks outside the visible range.
  // Same qk.calendarBlocks.all key the dashboard uses, so a block created,
  // moved, or deleted here is instantly reflected there too.
  const { data: blocks = [] } = useQuery({
    queryKey: qk.calendarBlocks.all,
    queryFn: () => apiFetch<CalendarBlock[]>("/api/calendar-blocks"),
  });
  const { data: occurrences = [] } = useQuery({
    queryKey: qk.calendarOccurrences(rangeStartParam, rangeEndParam),
    queryFn: () =>
      apiFetch<CalendarOccurrence[]>(`/api/calendar/occurrences?from=${rangeStartParam}&to=${rangeEndParam}`),
  });

  // Mutations below (create/edit/delete/reschedule a block, sync from
  // Google, a recurring series write) can't predict every id that changed
  // server-side — this is the "give up trying to patch the cache by hand,
  // just refetch" escape hatch for exactly those cases.
  function load() {
    queryClient.invalidateQueries({ queryKey: qk.calendarCapacity(rangeStartParam, rangeEndParam) });
    queryClient.invalidateQueries({ queryKey: qk.calendarBlocks.all });
    queryClient.invalidateQueries({ queryKey: qk.calendarOccurrences(rangeStartParam, rangeEndParam) });
  }

  function shiftPeriod(delta: number) {
    setNavDirection(delta > 0 ? 1 : -1);
    setAnchorDate((current) => {
      if (view === "week") return addDays(current, delta * 7);
      if (view === "day") return addDays(current, delta);
      return new Date(current.getFullYear(), current.getMonth() + delta, 1);
    });
  }

  const { data: allTasks = [] } = useQuery({
    queryKey: qk.tasks.all,
    queryFn: () => apiFetch<Task[]>("/api/tasks"),
  });
  const openTasks = useMemo(() => allTasks.filter((t) => t.status === "open"), [allTasks]);

  async function showPlanSuggestions() {
    setSuggesting(true);
    setSuggestError(null);
    try {
      const result = await apiFetch<{ days: PlanSuggestionDay[] }>("/api/planning/suggest");
      setSuggestions(result.days);
    } catch (error) {
      setSuggestError(error instanceof ApiError ? error.message : "Couldn't load suggestions.");
      setSuggestions([]);
    } finally {
      setSuggesting(false);
    }
  }

  async function syncGoogleCalendar() {
    setGoogleSyncing(true);
    try {
      await apiFetch("/api/google-calendar/sync", { method: "POST" });
      load();
      setGoogleSynced(true);
      // Icon holds the checkmark just long enough to register, then
      // reverts on its own — no separate dismiss action for a state this
      // transient.
      setTimeout(() => setGoogleSynced(false), 1800);
    } finally {
      setGoogleSyncing(false);
    }
  }

  // Patches the single shared qk.calendarBlocks.all cache entry — the
  // dashboard reads the exact same key, so a status/description/reminder
  // change made here is visible there without it doing anything.
  function patchBlock(updated: CalendarBlock) {
    queryClient.setQueryData(qk.calendarBlocks.all, (current: CalendarBlock[] | undefined) =>
      (current ?? []).map((b) => (b.id === updated.id ? updated : b)),
    );
  }

  async function updateStatus(block: CalendarBlock, status: CalendarBlock["status"]) {
    const updated = await apiFetch<CalendarBlock>(`/api/calendar-blocks/${block.id}`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    });
    patchBlock(updated);
  }

  // Lecture/external blocks skip the full Add/Edit form (their time and
  // type come from the class session or Google, not something to hand-edit
  // here) but a note is still just a note — every block type can carry
  // one, saved on its own rather than bundled into that form.
  async function updateDescription(block: CalendarBlock, description: string) {
    const updated = await apiFetch<CalendarBlock>(`/api/calendar-blocks/${block.id}`, {
      method: "PUT",
      body: JSON.stringify({ description: description || null }),
    });
    patchBlock(updated);
  }

  // ClassSession's remind_minutes_before is already an offset, unlike
  // CalendarBlock's remind_at — no absolute-time math needed here, it's
  // saved as-is and re-evaluated against each week's occurrence server-side.
  async function updateOccurrenceDescription(occurrence: CalendarOccurrence, description: string) {
    const updated = await apiFetch<ClassSession>(`/api/class-sessions/${occurrence.sourceId}`, {
      method: "PUT",
      body: JSON.stringify({ description: description || null }),
    });
    setDetailsOccurrence((current) =>
      current && current.sourceId === occurrence.sourceId ? { ...current, description: updated.description } : current,
    );
  }

  async function updateOccurrenceReminder(occurrence: CalendarOccurrence, minutes: number | null, recurring: boolean) {
    const updated = await apiFetch<ClassSession>(`/api/class-sessions/${occurrence.sourceId}`, {
      method: "PUT",
      // A class recurs weekly on its own, but a reminder on it doesn't
      // inherit that — off by default (fires once, for the next
      // occurrence, then the backend clears it), recurring only if asked.
      body: JSON.stringify({ remind_minutes_before: minutes, remind_recurring: minutes === null ? false : recurring }),
    });
    setDetailsOccurrence((current) =>
      current && current.sourceId === occurrence.sourceId
        ? { ...current, remindMinutesBefore: updated.remind_minutes_before, remindRecurring: updated.remind_recurring }
        : current,
    );
  }

  async function updateReminder(block: CalendarBlock, offsetMinutes: number | null) {
    const remindAt =
      offsetMinutes === null ? null : new Date(new Date(block.start_at).getTime() - offsetMinutes * 60_000).toISOString();
    const updated = await apiFetch<CalendarBlock>(`/api/calendar-blocks/${block.id}`, {
      method: "PUT",
      body: JSON.stringify({ remind_at: remindAt }),
    });
    patchBlock(updated);
  }

  function startCreate(defaultDate?: string, startTime?: string, endTime?: string) {
    setEditingBlockId("new");
    setBlockForm({
      ...EMPTY_BLOCK_FORM,
      date: defaultDate ?? toDateParam(new Date()),
      start_time: startTime ?? EMPTY_BLOCK_FORM.start_time,
      end_time: endTime ?? EMPTY_BLOCK_FORM.end_time,
    });
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
      repeat_until: "",
    });
    setBlockFormError(null);
  }

  function cancelBlockForm() {
    setEditingBlockId(null);
    setBlockFormError(null);
  }

  // Turning a suggestion into a block reuses the exact same Add/Edit
  // block popup as the rest of the calendar — editing a suggestion looks
  // and works identically to editing any other block, not a bespoke form.
  function startEditFromSuggestion(day: PlanSuggestionDay, item: PlanSuggestionItem) {
    setSuggestions(null);
    setEditingBlockId("new");
    setBlockForm({
      ...EMPTY_BLOCK_FORM,
      title: item.title,
      date: day.date,
      start_time: item.startTime,
      end_time: item.endTime,
      task_id: String(item.taskId),
    });
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
          body: JSON.stringify({ ...body, recurrence_until: blockForm.repeat_until || null }),
        });
        if (blockForm.repeat_until) {
          // The response is only the first occurrence — the rest of the
          // series exists server-side now, so refetch rather than
          // appending just the one row we got back.
          load();
        } else {
          queryClient.setQueryData(qk.calendarBlocks.all, (current: CalendarBlock[] | undefined) => [
            ...(current ?? []),
            created,
          ]);
        }
      } else if (editingBlockId !== null) {
        const updated = await apiFetch<CalendarBlock>(`/api/calendar-blocks/${editingBlockId}`, {
          method: "PUT",
          body: JSON.stringify(body),
        });
        patchBlock(updated);
      }
      setEditingBlockId(null);
    } catch (err) {
      setBlockFormError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setBlockFormSubmitting(false);
    }
  }

  async function deleteBlock(block: CalendarBlock, scope: "this" | "following" | "all" = "this"): Promise<boolean> {
    const label =
      scope === "following"
        ? "this and every later occurrence in the series"
        : scope === "all"
          ? "the entire recurring series"
          : `"${block.title ?? "this block"}"`;
    if (!window.confirm(`Delete ${label}? This can't be undone.`)) return false;

    await apiFetch(`/api/calendar-blocks/${block.id}${scope !== "this" ? `?scope=${scope}` : ""}`, { method: "DELETE" });

    if (scope === "this") {
      queryClient.setQueryData(qk.calendarBlocks.all, (current: CalendarBlock[] | undefined) =>
        (current ?? []).filter((b) => b.id !== block.id),
      );
    } else {
      // Multiple rows removed server-side and we don't know their ids
      // client-side without asking — refetch instead of guessing.
      load();
    }
    return true;
  }

  // Small drag distance before a drag "activates" — lets a plain click
  // still open the details popup (onClick fires normally below that
  // threshold) instead of every click being swallowed as a zero-distance drag.
  const dragSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  // Dropping on a day cell (month view) keeps the block's time-of-day and
  // duration, only the date changes. Dropping on an hour slot (week/day
  // view) keeps the duration, sets both date and start time. Either way
  // this is the same PUT the manual edit form uses, so the backend's
  // existing "a time change means status becomes moved" rule
  // (CalendarBlockController) applies here too — no separate logic needed.
  async function rescheduleBlock(block: CalendarBlock, date: string, startTime?: string) {
    const durationMs = new Date(block.end_at).getTime() - new Date(block.start_at).getTime();
    const time = startTime ?? block.start_at.slice(11, 16);
    const start = new Date(`${date}T${time}`);
    const end = new Date(start.getTime() + durationMs);

    const updated = await apiFetch<CalendarBlock>(`/api/calendar-blocks/${block.id}`, {
      method: "PUT",
      body: JSON.stringify({
        start_at: `${date}T${time}`,
        end_at: `${toDateParam(end)}T${end.toTimeString().slice(0, 5)}`,
      }),
    });
    patchBlock(updated);
  }

  function handleDragEnd(event: DragEndEvent) {
    if (!event.over) return;
    const block = (event.active.data.current as { block?: CalendarBlock } | undefined)?.block;
    if (!block) return;

    const overId = String(event.over.id);
    if (overId.startsWith("date:")) {
      rescheduleBlock(block, overId.slice("date:".length));
    } else if (overId.startsWith("slot:")) {
      const [, date, hour] = overId.split(":");
      rescheduleBlock(block, date, `${hour.padStart(2, "0")}:00`);
    }
  }

  // Click-drag create (week/day view only — month view stays click-to-
  // open-form, there's no time-of-day axis to drag across there). A ref
  // carries the in-progress drag so the window mousemove/mouseup
  // listeners can be attached once on mount rather than re-subscribing
  // every pixel of movement; dragPreview is the render-facing mirror of
  // the same value, for the ghost block shown while dragging.
  const dragCreateRef = useRef<{ date: string; top: number; startMinutes: number; endMinutes: number } | null>(null);
  const [dragPreview, setDragPreview] = useState<{ date: string; startMinutes: number; endMinutes: number } | null>(null);

  function beginDragCreate(event: ReactMouseEvent<HTMLDivElement>, date: string) {
    if ((event.target as HTMLElement).closest("[data-block-drag]")) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const minutes = minutesFromTimelineOffset(event.clientY - rect.top);
    const next = { date, top: rect.top, startMinutes: minutes, endMinutes: minutes + 15 };
    dragCreateRef.current = next;
    setDragPreview(next);
  }

  useEffect(() => {
    function handleMove(event: MouseEvent) {
      const state = dragCreateRef.current;
      if (!state) return;
      const minutes = minutesFromTimelineOffset(event.clientY - state.top);
      const next = {
        date: state.date,
        top: state.top,
        startMinutes: Math.min(state.startMinutes, minutes),
        endMinutes: Math.max(state.startMinutes, minutes, state.startMinutes + 15),
      };
      dragCreateRef.current = next;
      setDragPreview(next);
    }
    function handleUp() {
      const state = dragCreateRef.current;
      dragCreateRef.current = null;
      setDragPreview(null);
      if (!state) return;
      startCreate(state.date, minutesToTime(state.startMinutes), minutesToTime(state.endMinutes));
    }
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, []);

  const weeks = weekChunks(gridDays);
  const detailsBlock = blocks.find((b) => b.id === detailsBlockId) ?? null;
  const editingBlock = editingBlockId !== null && editingBlockId !== "new" ? blocks.find((b) => b.id === editingBlockId) ?? null : null;

  // Client-side search: everything it needs (blocks, open tasks) is
  // already in page state from the unscoped /api/calendar-blocks and
  // /api/tasks fetches, so no new endpoint.
  const searchMatches = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return [];

    const blockMatches = blocks
      .filter((b) => b.status !== "skipped")
      .filter((b) => [b.title, b.location, b.description].some((field) => field?.toLowerCase().includes(query)))
      .map((b) => ({ kind: "block" as const, id: b.id, title: b.title ?? "Study", date: b.start_at.slice(0, 10) }));

    const taskMatches = openTasks
      .filter((t) => t.title.toLowerCase().includes(query))
      .map((t) => ({ kind: "task" as const, id: t.id, title: t.title, date: null as string | null }));

    return [...blockMatches, ...taskMatches].slice(0, 8);
  }, [searchQuery, blocks, openTasks]);

  function jumpToSearchResult(date: string | null) {
    if (date) {
      setNavDirection(0);
      setAnchorDate(new Date(`${date}T00:00:00`));
      setView("day");
    }
    setSearchOpen(false);
    setSearchQuery("");
  }

  return (
    <main className="relative bg-[var(--fn-paper)] min-h-dvh w-full px-4 py-6 md:px-8 md:py-10 md:pr-12 md:pl-24">
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
          <h1
            key={`${view}-${anchorDate.getTime()}`}
            className={`mt-1 text-2xl font-semibold ${monthMorphClass(navDirection)}`}
          >
            {viewLabel(view, anchorDate)}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Page-turn control: arrows nudge toward the direction they
              travel on hover (a page turning), "Today" reads as the tab
              you'd flip back to, not a third identical pill next to two
              arrows. Step size (month/week/day) follows the active view. */}
          <div className="fn-mono flex items-center gap-0.5 text-xs">
            <button
              type="button"
              onClick={() => shiftPeriod(-1)}
              aria-label={`Previous ${view}`}
              title={`Previous ${view}`}
              className="fn-nav-arrow"
            >
              <ChevronLeft size={16} strokeWidth={2} />
            </button>
            <button
              type="button"
              onClick={() => {
                setNavDirection(0);
                setAnchorDate(new Date());
              }}
              className="fn-nav-today"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => shiftPeriod(1)}
              aria-label={`Next ${view}`}
              title={`Next ${view}`}
              className="fn-nav-arrow fn-nav-arrow--next"
            >
              <ChevronRight size={16} strokeWidth={2} />
            </button>
          </div>

          {/* View switcher: same dashed-ghost vocabulary as the rest of
              the toolbar, active view reads as "pinned down" (solid)
              against the other two (ghost). */}
          <div className="fn-view-toggle" role="group" aria-label="Calendar view">
            {(["month", "week", "day"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setView(option)}
                aria-pressed={view === option}
                className={`fn-view-toggle-btn ${view === option ? "fn-view-toggle-btn--active" : ""}`}
              >
                {option === "month" ? "Month" : option === "week" ? "Week" : "Day"}
              </button>
            ))}
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setSearchOpen((current) => !current)}
              aria-label="Search calendar"
              title="Search (/)"
              className="fn-nav-arrow"
            >
              <Search size={16} strokeWidth={2} />
            </button>
            {searchOpen && (
              <div className="fn-popup-card absolute right-0 top-10 z-30 w-72 rounded-lg border border-[var(--fn-rule)] bg-[var(--fn-paper)] p-2 shadow-xl">
                <div className="flex items-center gap-1.5 border-b border-[var(--fn-rule)] px-1 pb-2">
                  <Search size={14} className="text-[var(--fn-muted)]" />
                  <input
                    autoFocus
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search blocks and tasks…"
                    className="w-full bg-transparent text-sm outline-none"
                  />
                  <button type="button" onClick={() => setSearchOpen(false)} aria-label="Close search">
                    <X size={14} className="text-[var(--fn-muted)]" />
                  </button>
                </div>
                {searchQuery.trim() && (
                  <ul className="mt-1 flex max-h-64 flex-col overflow-y-auto">
                    {searchMatches.length === 0 && (
                      <li className="px-2 py-2 text-sm text-[var(--fn-muted)]">No matches.</li>
                    )}
                    {searchMatches.map((match) => (
                      <li key={`${match.kind}-${match.id}`}>
                        <button
                          type="button"
                          onClick={() => jumpToSearchResult(match.date)}
                          className="fn-suggestion-item flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm"
                        >
                          <span className="truncate">{match.title}</span>
                          <span className="fn-mono shrink-0 text-[10px] uppercase tracking-wide text-[var(--fn-muted)]">
                            {match.kind === "block" ? "Block" : "Task"}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          <select
            value={displayTimezone}
            onChange={(event) => setDisplayTimezone(event.target.value)}
            aria-label="Display timezone"
            title="Display timezone for block times"
            className="fn-mono w-20 rounded-md border border-[var(--fn-rule)] bg-transparent px-2 py-1.5 text-xs text-[var(--fn-muted)] hover:text-[var(--fn-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--fn-cobalt)] sm:w-auto"
          >
            <option value={systemTimezone()}>{systemTimezone()} (this device)</option>
            {TIMEZONE_OPTIONS.filter((zone) => zone !== systemTimezone()).map((zone) => (
              <option key={zone} value={zone}>
                {zone}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => (editingBlockId === null ? startCreate() : cancelBlockForm())}
            aria-label={editingBlockId === null ? "Add block" : "Hide add block form"}
            title={editingBlockId === null ? "Add block" : "Hide"}
            className="fn-add-btn"
          >
            <Plus size={18} strokeWidth={2.25} className={editingBlockId === null ? "fn-add-btn-icon" : "fn-add-btn-icon rotate-45"} />
          </button>

          {/* Styled like the calendar's own "suggested" blocks (dashed
              cobalt outline, no fill) rather than a solid SaaS CTA — the
              button borrows the vocabulary it produces, instead of
              looking bolted on next to it. */}
          <button
            type="button"
            onClick={showPlanSuggestions}
            disabled={suggesting}
            aria-label={suggesting ? "Sketching…" : "Suggest study plan"}
            className="fn-suggest-btn"
          >
            <PenLine size={15} strokeWidth={2} className={suggesting ? "fn-suggest-btn-icon animate-[fn-scribble_0.6s_ease-in-out_infinite]" : "fn-suggest-btn-icon"} />
            <span className="hidden sm:inline">{suggesting ? "Sketching…" : "Suggest study plan"}</span>
          </button>

          {/* Sage, not cobalt — same "borrow the color of what it
              touches" logic as the suggest button, just pointed at the
              sage Google-block vocabulary instead of the suggested-block
              one. Only shown once a Google account is actually connected;
              otherwise it's a control for a feature that isn't on. */}
          {googleConnected && (
            <button
              type="button"
              onClick={syncGoogleCalendar}
              disabled={googleSyncing}
              aria-label={googleSynced ? "Synced" : googleSyncing ? "Syncing…" : "Sync Google Calendar"}
              className={`fn-sync-btn ${googleSynced ? "fn-sync-btn--done" : ""}`}
            >
              {googleSynced ? (
                <Check size={15} strokeWidth={2.5} className="fn-sync-btn-check" />
              ) : (
                <RefreshCw size={15} strokeWidth={2} className={googleSyncing ? "animate-spin" : ""} />
              )}
              <span className="hidden sm:inline">
                {googleSynced ? "Synced" : googleSyncing ? "Syncing…" : "Sync Google Calendar"}
              </span>
            </button>
          )}
        </div>
      </div>

      <DndContext sensors={dragSensors} onDragEnd={handleDragEnd}>
      {view === "month" && (
        <>
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
          <div
            key={anchorDate.getTime()}
            className={`border-t border-[var(--fn-rule)] ${monthMorphClass(navDirection)}`}
          >
          {weeks.map((week, weekIndex) => (
            <div
              key={weekIndex}
              className={`grid grid-cols-7 ${weekIndex < weeks.length - 1 ? "border-b border-[var(--fn-rule)]" : ""}`}
            >
            {week.map((cellDate) => {
              const dateParam = toDateParam(cellDate);
              const day = days?.find((d) => d.date === dateParam);
              const inMonth = cellDate.getMonth() === anchorDate.getMonth();
              const dayBlocks = blocks.filter((b) => b.start_at.slice(0, 10) === dateParam && b.status !== "skipped");
              const dayOccurrences = occurrences.filter((o) => o.date === dateParam);
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
                <DroppableZone
                  key={dateParam}
                  id={`date:${dateParam}`}
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

                  {dayOccurrences.length > 0 && (
                    // Not draggable (the underlying schedule/pattern lives
                    // in Settings/Courses, not here) but clickable — every
                    // occurrence, course lectures included, opens details
                    // where a note or reminder can be added.
                    <div className="flex flex-col gap-1">
                      {dayOccurrences.map((occurrence) => (
                        <button
                          type="button"
                          key={`${occurrence.source}-${occurrence.sourceId}-${occurrence.date}`}
                          onClick={() => selectOccurrence(occurrence)}
                          title={occurrence.location ? `${occurrence.title} · ${occurrence.location}` : occurrence.title}
                          className={`flex w-full flex-col gap-0.5 rounded px-1.5 py-1 text-left text-[11px] hover:brightness-95 ${occurrenceStyle(occurrence.source)}`}
                        >
                          <span className="truncate font-medium">{occurrence.title}</span>
                          <span className="fn-mono">
                            {occurrence.startTime}–{occurrence.endTime}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {dayBlocks.length > 0 && (
                    <div className="flex flex-col gap-1">
                      {visibleBlocks.map((block) => (
                        <DraggableBlock
                          key={block.id}
                          block={block}
                          onClick={() => selectBlock(block.id)}
                          displayTimezone={displayTimezone}
                          className={`relative flex w-full flex-col gap-0.5 rounded px-1.5 py-1 text-left text-[11px] hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--fn-cobalt)] ${blockStyle(block)} ${isBlockDraggable(block) ? "cursor-grab active:cursor-grabbing" : ""}`}
                        >
                          <span className="truncate font-medium">{block.title ?? "Study"}</span>
                          <span className="fn-mono">
                            {formatTime(block.start_at, displayTimezone)}–{formatTime(block.end_at, displayTimezone)}
                          </span>
                        </DraggableBlock>
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
                </DroppableZone>
              );
            })}
            </div>
          ))}
          </div>
        </>
      )}

      {(view === "week" || view === "day") && (
        <div className={`mt-8 overflow-x-auto ${view === "week" ? "fn-scroll-fade" : ""}`}>
          <div className={`flex ${view === "week" ? "min-w-[640px]" : ""}`}>
            {/* Time gutter — one label per hour, vertically centered on
                its hour line via a negative top offset. */}
            <div className="fn-mono w-14 shrink-0 pr-2 text-right text-[10px] text-[var(--fn-muted)]">
              <div className="h-8" />
              {timelineHours().map((hour) => (
                <div key={hour} style={{ height: HOUR_HEIGHT_PX }} className="relative">
                  <span className="absolute -top-1.5 right-0">{hourLabel(hour)}</span>
                </div>
              ))}
            </div>

            {(view === "week" ? weekDays : [anchorDate]).map((cellDate) => {
              const dateParam = toDateParam(cellDate);
              const dayBlocks = blocks.filter((b) => b.start_at.slice(0, 10) === dateParam && b.status !== "skipped");
              const laidOut = layoutDayBlocks(dayBlocks);
              const dayOccurrences = occurrences.filter((o) => o.date === dateParam);
              const day = days?.find((d) => d.date === dateParam);

              return (
                <div key={dateParam} className="flex-1 border-l border-[var(--fn-rule)]/40 first:border-l-0">
                  <button
                    type="button"
                    onClick={() => startCreate(dateParam)}
                    className="fn-mono flex h-8 w-full flex-col items-center justify-center gap-0.5 text-[11px] text-[var(--fn-muted)] hover:text-[var(--fn-cobalt)]"
                  >
                    <span className="relative inline-block">
                      {isToday(dateParam) && <TodayMark />}
                      <span className="relative">
                        {view === "week" ? DAYS[cellDate.getDay()].toUpperCase() : cellDate.toLocaleDateString(undefined, { weekday: "long" })}
                        {" "}
                        {cellDate.getDate()}
                      </span>
                    </span>
                  </button>
                  <div
                    className="relative border-t border-[var(--fn-rule)] select-none"
                    style={{ height: timelineHours().length * HOUR_HEIGHT_PX }}
                    onMouseDown={(event) => beginDragCreate(event, dateParam)}
                  >
                    {timelineHours().map((hour, index) => (
                      <DroppableZone
                        key={hour}
                        id={`slot:${dateParam}:${hour}`}
                        className="absolute left-0 right-0 border-t border-[var(--fn-rule)]/30"
                        style={{ top: index * HOUR_HEIGHT_PX, height: HOUR_HEIGHT_PX }}
                      />
                    ))}
                    {day?.is_break && (
                      <span className="fn-mono absolute left-1 top-1 text-[10px] text-[var(--fn-muted)]">Break</span>
                    )}
                    {/* Timetable/commitment occurrences, drawn behind real
                        blocks (lower in the DOM = painted first). Not
                        draggable (the pattern lives in Settings/Courses)
                        but clickable — data-block-drag keeps a click from
                        also starting the drag-to-create-block gesture on
                        the timeline underneath it. */}
                    {dayOccurrences.map((occurrence) => {
                      const { top, height } = occurrenceTimelinePosition(occurrence);
                      return (
                        <button
                          type="button"
                          data-block-drag
                          key={`${occurrence.source}-${occurrence.sourceId}-${occurrence.date}`}
                          onClick={() => selectOccurrence(occurrence)}
                          title={occurrence.location ? `${occurrence.title} · ${occurrence.location}` : occurrence.title}
                          style={{ top, height }}
                          className={`absolute left-0 right-0 overflow-hidden rounded px-1.5 py-1 text-left text-[11px] hover:brightness-95 ${occurrenceStyle(occurrence.source)}`}
                        >
                          <span className="block truncate font-medium">{occurrence.title}</span>
                          <span className="fn-mono block truncate">
                            {occurrence.startTime}–{occurrence.endTime}
                          </span>
                        </button>
                      );
                    })}
                    {dragPreview?.date === dateParam && (
                      <div
                        className="fn-drag-preview pointer-events-none absolute left-0 right-0 rounded"
                        style={{
                          top: ((dragPreview.startMinutes - TIMELINE_START_HOUR * 60) / 60) * HOUR_HEIGHT_PX,
                          height: ((dragPreview.endMinutes - dragPreview.startMinutes) / 60) * HOUR_HEIGHT_PX,
                        }}
                      >
                        <span className="fn-mono absolute left-1.5 top-1 text-[10px] text-[var(--fn-paper)]">
                          {minutesToTime(dragPreview.startMinutes)}–{minutesToTime(dragPreview.endMinutes)}
                        </span>
                      </div>
                    )}
                    {laidOut.map(({ block, column, columns }) => {
                      const { top, height } = timelineBlockPosition(block);
                      const widthPct = 100 / columns;
                      return (
                        <DraggableBlock
                          key={block.id}
                          block={block}
                          onClick={() => selectBlock(block.id)}
                          displayTimezone={displayTimezone}
                          style={{
                            top,
                            height,
                            left: `calc(${column * widthPct}% + 2px)`,
                            width: `calc(${widthPct}% - 4px)`,
                          }}
                          className={`absolute rounded px-1.5 py-1 text-left text-[11px] hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--fn-cobalt)] ${blockStyle(block)} ${isBlockDraggable(block) ? "cursor-grab active:cursor-grabbing" : ""}`}
                        >
                          <span className="block truncate font-medium">{block.title ?? "Study"}</span>
                          <span className="fn-mono block truncate">
                            {formatTime(block.start_at, displayTimezone)}–{formatTime(block.end_at, displayTimezone)}
                          </span>
                        </DraggableBlock>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      </DndContext>

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
                isRecurring={editingBlock !== null && editingBlock.recurrence_group_id !== null}
                onSubmit={submitBlock}
                onCancel={cancelBlockForm}
                deleteControls={
                  editingBlock && (
                    <DeleteBlockControls
                      block={editingBlock}
                      onDelete={(scope) => deleteBlock(editingBlock, scope).then((deleted) => deleted && cancelBlockForm())}
                    />
                  )
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
            if (event.target === event.currentTarget) selectBlock(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={detailsBlock.title ?? "Block details"}
            className="fn-popup-card max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg border border-[var(--fn-rule)] bg-[var(--fn-paper)] p-6 shadow-xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="fn-eyebrow">{blockTypeLabel(detailsBlock)}</p>
                <h2 className="mt-1 text-lg font-semibold">{detailsBlock.title ?? "Study"}</h2>
              </div>
              <button
                type="button"
                onClick={() => selectBlock(null)}
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
                  {formatTime(detailsBlock.start_at, displayTimezone)}–{formatTime(detailsBlock.end_at, displayTimezone)}
                </dd>
              </div>
              {detailsBlock.location && (
                <div className="flex gap-2">
                  <dt className="w-20 shrink-0 text-[var(--fn-muted)]">Where</dt>
                  <dd>{detailsBlock.location}</dd>
                </div>
              )}
              <div className="flex gap-2">
                <dt className="w-20 shrink-0 pt-1 text-[var(--fn-muted)]">Notes</dt>
                <dd className="min-w-0 flex-1">
                  {editingDescription ? (
                    <div className="flex flex-col gap-2">
                      <textarea
                        autoFocus
                        value={descriptionDraft}
                        onChange={(event) => setDescriptionDraft(event.target.value)}
                        rows={3}
                        placeholder="Add a note…"
                        className="fn-input w-full resize-y font-sans text-sm"
                      />
                      {/* Reminder rides on the note being written, not a
                          standalone control — "remind me about this"
                          reads naturally right under what "this" is. */}
                      <label className="flex items-center gap-2 text-xs text-[var(--fn-ink)]">
                        <input
                          type="checkbox"
                          checked={reminderEnabled}
                          onChange={(event) => setReminderEnabled(event.target.checked)}
                        />
                        Remind me about this
                      </label>
                      {reminderEnabled && (
                        <select
                          value={reminderMinutes}
                          onChange={(event) => setReminderMinutes(Number(event.target.value))}
                          className="fn-input w-fit py-1 text-sm"
                        >
                          {REMINDER_PRESETS.filter((preset) => preset.minutes !== null).map((preset) => (
                            <option key={preset.label} value={preset.minutes ?? 0}>
                              {preset.label}
                            </option>
                          ))}
                        </select>
                      )}
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={savingDescription}
                          onClick={async () => {
                            setSavingDescription(true);
                            await Promise.all([
                              updateDescription(detailsBlock, descriptionDraft),
                              updateReminder(detailsBlock, reminderEnabled ? reminderMinutes : null),
                            ]);
                            setSavingDescription(false);
                            setEditingDescription(false);
                          }}
                          className="fn-btn-primary !w-fit px-3 py-1 text-xs"
                        >
                          {savingDescription ? "Saving…" : "Save"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingDescription(false)}
                          className="rounded-md border border-[var(--fn-rule)] px-3 py-1 text-xs hover:bg-[var(--fn-canvas)]"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setDescriptionDraft(detailsBlock.description ?? "");
                        if (detailsBlock.remind_at !== null) {
                          setReminderEnabled(true);
                          setReminderMinutes(
                            Math.round(
                              (new Date(detailsBlock.start_at).getTime() - new Date(detailsBlock.remind_at).getTime()) /
                                60_000,
                            ),
                          );
                        }
                        setEditingDescription(true);
                      }}
                      title={detailsBlock.description ? "Edit note" : undefined}
                      // Google's auto-generated event notes can run to several
                      // paragraphs with long unbroken URLs (Gmail/Calendar
                      // boilerplate) — capped with its own scroll rather than
                      // growing the whole popup past the viewport, and
                      // break-words stops a long URL from blowing out the
                      // fixed-width card.
                      className="max-h-40 w-full overflow-y-auto text-left whitespace-pre-wrap break-words hover:text-[var(--fn-cobalt)]"
                    >
                      {detailsBlock.description ? (
                        detailsBlock.description
                      ) : (
                        <span className="text-[var(--fn-cobalt)] underline underline-offset-2">Add a note</span>
                      )}
                      {detailsBlock.remind_at !== null && (
                        <span className="fn-mono mt-1 block text-[11px] font-normal text-[var(--fn-muted)]">
                          Reminder set
                        </span>
                      )}
                    </button>
                  )}
                </dd>
              </div>
              {detailsBlock.recurrence_group_id !== null && (
                <div className="flex gap-2">
                  <dt className="w-20 shrink-0 text-[var(--fn-muted)]">Repeats</dt>
                  <dd>Weekly</dd>
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
                      selectBlock(null);
                    }}
                    className="fn-btn-primary !w-fit px-4"
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      updateStatus(detailsBlock, "skipped");
                      selectBlock(null);
                    }}
                    className="rounded-md border border-[var(--fn-rule)] px-4 py-2 text-sm hover:bg-[var(--fn-canvas)]"
                  >
                    Skip
                  </button>
                </>
              )}
              {detailsBlock.status !== "suggested" && detailsBlock.type !== "lecture" && detailsBlock.type !== "external" && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      selectBlock(null);
                      startEdit(detailsBlock);
                    }}
                    className="rounded-md border border-[var(--fn-rule)] px-4 py-2 text-sm hover:bg-[var(--fn-canvas)]"
                  >
                    Edit
                  </button>
                  <DeleteBlockControls
                    block={detailsBlock}
                    onDelete={(scope) => deleteBlock(detailsBlock, scope).then((deleted) => deleted && selectBlock(null))}
                  />
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Occurrence details: class-timetable and recurring-commitment
          entries have no CalendarBlock row (see CalendarOccurrence's
          docblock), so this is a lighter sibling of the block-details
          popup above — day/time/location come from the underlying
          ClassSession/Commitment and aren't editable here (that's
          Courses/Settings' job), but every occurrence, course lectures
          included, can carry its own note and reminder. */}
      {detailsOccurrence && (
        <div
          className="fn-popup-backdrop fixed inset-0 z-40 flex items-center justify-center bg-black/30 p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) selectOccurrence(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={detailsOccurrence.title}
            className="fn-popup-card max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg border border-[var(--fn-rule)] bg-[var(--fn-paper)] p-6 shadow-xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="fn-eyebrow">
                  {detailsOccurrence.source === "class_session" ? detailsOccurrence.type : "Commitment"}
                </p>
                <h2 className="mt-1 text-lg font-semibold">{detailsOccurrence.title}</h2>
              </div>
              <button
                type="button"
                onClick={() => selectOccurrence(null)}
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
                  {detailsOccurrence.startTime}–{detailsOccurrence.endTime}
                </dd>
              </div>
              {detailsOccurrence.location && (
                <div className="flex gap-2">
                  <dt className="w-20 shrink-0 text-[var(--fn-muted)]">Where</dt>
                  <dd>{detailsOccurrence.location}</dd>
                </div>
              )}

              {detailsOccurrence.source === "class_session" && (
                <div className="flex gap-2">
                  <dt className="w-20 shrink-0 pt-1 text-[var(--fn-muted)]">Notes</dt>
                  <dd className="min-w-0 flex-1">
                    {editingOccurrenceDescription ? (
                      <div className="flex flex-col gap-2">
                        <textarea
                          autoFocus
                          value={occurrenceDescriptionDraft}
                          onChange={(event) => setOccurrenceDescriptionDraft(event.target.value)}
                          rows={3}
                          placeholder="Add a note…"
                          className="fn-input w-full resize-y font-sans text-sm"
                        />
                        <label className="flex items-center gap-2 text-xs text-[var(--fn-ink)]">
                          <input
                            type="checkbox"
                            checked={occurrenceReminderEnabled}
                            onChange={(event) => setOccurrenceReminderEnabled(event.target.checked)}
                          />
                          Remind me about this
                        </label>
                        {occurrenceReminderEnabled && (
                          <>
                            <select
                              value={occurrenceReminderMinutes}
                              onChange={(event) => setOccurrenceReminderMinutes(Number(event.target.value))}
                              className="fn-input w-fit py-1 text-sm"
                            >
                              {REMINDER_PRESETS.filter((preset) => preset.minutes !== null).map((preset) => (
                                <option key={preset.label} value={preset.minutes ?? 0}>
                                  {preset.label}
                                </option>
                              ))}
                            </select>
                            {/* Off by default — a reminder fires once for
                                the next class, then clears itself; this
                                class happening every week doesn't mean the
                                reminder should too, unless asked. */}
                            <label className="flex items-center gap-2 text-xs text-[var(--fn-muted)]">
                              <input
                                type="checkbox"
                                checked={occurrenceReminderRecurring}
                                onChange={(event) => setOccurrenceReminderRecurring(event.target.checked)}
                              />
                              Repeat every week
                            </label>
                          </>
                        )}
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={savingOccurrenceDescription}
                            onClick={async () => {
                              setSavingOccurrenceDescription(true);
                              await Promise.all([
                                updateOccurrenceDescription(detailsOccurrence, occurrenceDescriptionDraft),
                                updateOccurrenceReminder(
                                  detailsOccurrence,
                                  occurrenceReminderEnabled ? occurrenceReminderMinutes : null,
                                  occurrenceReminderRecurring,
                                ),
                              ]);
                              setSavingOccurrenceDescription(false);
                              setEditingOccurrenceDescription(false);
                            }}
                            className="fn-btn-primary !w-fit px-3 py-1 text-xs"
                          >
                            {savingOccurrenceDescription ? "Saving…" : "Save"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingOccurrenceDescription(false)}
                            className="rounded-md border border-[var(--fn-rule)] px-3 py-1 text-xs hover:bg-[var(--fn-canvas)]"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setOccurrenceDescriptionDraft(detailsOccurrence.description ?? "");
                          if (detailsOccurrence.remindMinutesBefore !== null) {
                            setOccurrenceReminderEnabled(true);
                            setOccurrenceReminderMinutes(detailsOccurrence.remindMinutesBefore);
                            setOccurrenceReminderRecurring(detailsOccurrence.remindRecurring);
                          }
                          setEditingOccurrenceDescription(true);
                        }}
                        title={detailsOccurrence.description ? "Edit note" : undefined}
                        className="max-h-40 w-full overflow-y-auto text-left whitespace-pre-wrap break-words hover:text-[var(--fn-cobalt)]"
                      >
                        {detailsOccurrence.description ? (
                          detailsOccurrence.description
                        ) : (
                          <span className="text-[var(--fn-cobalt)] underline underline-offset-2">Add a note</span>
                        )}
                        {detailsOccurrence.remindMinutesBefore !== null && (
                          <span className="fn-mono mt-1 block text-[11px] font-normal text-[var(--fn-muted)]">
                            Reminder set{detailsOccurrence.remindRecurring ? " · repeats weekly" : " · next class only"}
                          </span>
                        )}
                      </button>
                    )}
                  </dd>
                </div>
              )}

              <div className="flex gap-2">
                <dt className="w-20 shrink-0 text-[var(--fn-muted)]">Repeats</dt>
                <dd>Weekly</dd>
              </div>
            </dl>
          </div>
        </div>
      )}

      {/* Plan Suggestions: preview from /api/planning/suggest, capped to
          the coming week. Nothing lands on the calendar on its own —
          tapping a suggested item opens the same Add/Edit block popup as
          the rest of the calendar, pre-filled, so accepting or adjusting
          a suggestion is the identical flow to editing any other block. */}
      {suggestions !== null && (
        <div
          className="fn-popup-backdrop fixed inset-0 z-40 flex items-center justify-center bg-black/30 p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) setSuggestions(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Plan suggestions"
            className="fn-popup-card max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg border border-[var(--fn-rule)] bg-[var(--fn-paper)] p-6 shadow-xl"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="fn-eyebrow">Plan Suggestions</p>
                <p className="mt-0.5 text-xs text-[var(--fn-muted)]">Next 7 days · tap an item to edit and add it</p>
              </div>
              <button
                type="button"
                onClick={() => setSuggestions(null)}
                aria-label="Close"
                className="fn-mono text-lg leading-none text-[var(--fn-muted)] hover:text-[var(--fn-ink)]"
              >
                ×
              </button>
            </div>

            {suggestError && <p className="mt-4 text-sm text-[var(--fn-oxide)]">{suggestError}</p>}

            {!suggestError && suggestions.length === 0 && (
              <p className="mt-4 text-sm text-[var(--fn-muted)]">No open tasks to suggest work on this week.</p>
            )}

            {!suggestError && suggestions.length > 0 && (
              <div className="mt-4 flex flex-col gap-4">
                {suggestions.map((day) => (
                  <div key={day.date} className="border-t border-[var(--fn-rule)] pt-3 first:border-t-0 first:pt-0">
                    <div className="flex items-baseline justify-between">
                      <p className="text-sm font-semibold">
                        {new Date(`${day.date}T00:00:00`).toLocaleDateString(undefined, {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                      <p className="fn-mono text-xs text-[var(--fn-muted)]">{formatMinutes(day.totalMinutes)}</p>
                    </div>
                    <ul className="mt-2 flex flex-col gap-1">
                      {day.items.map((item, index) => (
                        <li key={`${item.taskId}-${index}`}>
                          <button
                            type="button"
                            onClick={() => startEditFromSuggestion(day, item)}
                            className="fn-suggestion-item flex w-full items-baseline justify-between gap-3 rounded-md px-1.5 py-1 text-left text-sm"
                          >
                            <span>
                              {item.title}
                              {item.courseTitle && <span className="text-[var(--fn-muted)]"> · {item.courseTitle}</span>}
                            </span>
                            <span className="fn-mono shrink-0 text-xs text-[var(--fn-muted)]">{formatMinutes(item.minutes)}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
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
          <span className="h-3 w-3 rounded border border-[var(--fn-sage)] bg-[var(--fn-sage)]/10" /> CLASS / GOOGLE (READ-ONLY)
        </span>
        <span className="flex items-center gap-2">
          <span className="h-3 w-3 rounded border border-[var(--fn-ochre)] bg-[var(--fn-ochre)]/10" /> COMMITMENT (READ-ONLY)
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
