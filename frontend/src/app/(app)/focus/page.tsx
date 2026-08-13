"use client";

import { useEffect, useState, type FormEvent } from "react";
import { apiFetch } from "@/lib/api";
import type {
  CalendarBlock,
  StudySession,
  StudySessionOutcome,
  Task,
} from "@/lib/types";

const OUTCOMES: StudySessionOutcome[] = [
  "completed",
  "partial",
  "blocked",
  "longer_than_estimated",
  "easier_than_estimated",
];

function formatElapsed(seconds: number): string {
  const mins = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const secs = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${mins}:${secs}`;
}

// Focus session — see "Focus session" in mdfile/DESIGN.md. The circular
// timer is not the only way to read progress: elapsed/remaining are also
// rendered as plain text for screen readers and low-motion users.
export default function FocusPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [session, setSession] = useState<StudySession | null>(null);
  const [ended, setEnded] = useState(false);
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    apiFetch<Task[]>("/api/tasks").then((list) =>
      setTasks(list.filter((task) => task.status === "open")),
    );
  }, []);

  if (session && !ended) {
    return (
      <RunningSession
        session={session}
        stuck={stuck}
        onStuck={() => setStuck(true)}
        onChange={setSession}
        onEnded={() => setEnded(true)}
      />
    );
  }

  if (session && ended) {
    return (
      <ReflectionForm
        session={session}
        stuck={stuck}
        onDone={() => {
          setSession(null);
          setEnded(false);
          setStuck(false);
        }}
      />
    );
  }

  return <StartSession tasks={tasks} onStarted={setSession} />;
}

function StartSession({
  tasks,
  onStarted,
}: {
  tasks: Task[];
  onStarted: (session: StudySession) => void;
}) {
  const [taskId, setTaskId] = useState("");
  const [minutes, setMinutes] = useState(90);
  const [submitting, setSubmitting] = useState(false);

  const selectedTaskId = taskId || (tasks[0] ? String(tasks[0].id) : "");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const task = tasks.find((item) => item.id === Number(selectedTaskId));
      const now = new Date();
      const end = new Date(now.getTime() + minutes * 60_000);

      const block = await apiFetch<CalendarBlock>("/api/calendar-blocks", {
        method: "POST",
        body: JSON.stringify({
          task_id: task?.id ?? null,
          type: "study",
          title: task?.title ?? "Focus session",
          start_at: now.toISOString(),
          end_at: end.toISOString(),
        }),
      });

      const session = await apiFetch<StudySession>("/api/study-sessions/start", {
        method: "POST",
        body: JSON.stringify({ calendar_block_id: block.id, planned_minutes: minutes }),
      });

      onStarted(session);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="fn-sheet min-h-dvh w-full px-8 py-10 md:px-12">
      <p className="fn-eyebrow">Focus</p>
      <h1 className="mt-1 text-2xl font-semibold">Start a session</h1>

      {tasks.length === 0 ? (
        <p className="mt-6 text-sm text-[var(--fn-muted)]">No open tasks to focus on.</p>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="fn-label">Task</span>
            <select
              value={selectedTaskId}
              onChange={(event) => setTaskId(event.target.value)}
              className="fn-input"
            >
              {tasks.map((task) => (
                <option key={task.id} value={task.id}>
                  {task.title}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="fn-label">Planned minutes</span>
            <input
              type="number"
              min={5}
              value={minutes}
              onChange={(event) => setMinutes(Number(event.target.value))}
              className="fn-input"
            />
          </label>
          <button type="submit" disabled={submitting} className="fn-btn-primary !w-fit px-4">
            {submitting ? "Starting…" : "Start focus session"}
          </button>
        </form>
      )}
    </main>
  );
}

function CircularProgress({ progress }: { progress: number }) {
  const size = 220;
  const stroke = 6;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(1, Math.max(0, progress));

  return (
    <svg width={size} height={size} className="-rotate-90" aria-hidden>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--fn-rule)"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--fn-cobalt)"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - clamped)}
        style={{ transition: "stroke-dashoffset 0.3s linear" }}
      />
    </svg>
  );
}

function RunningSession({
  session,
  stuck,
  onStuck,
  onChange,
  onEnded,
}: {
  session: StudySession;
  stuck: boolean;
  onStuck: () => void;
  onChange: (session: StudySession) => void;
  onEnded: () => void;
}) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (session.status !== "running") return;
    const startedAt = new Date(session.started_at).getTime();
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [session.started_at, session.status]);

  const plannedSeconds = session.planned_minutes * 60;
  const remainingSeconds = Math.max(0, plannedSeconds - elapsed);

  async function pause() {
    const updated = await apiFetch<StudySession>(`/api/study-sessions/${session.id}/pause`, {
      method: "POST",
    });
    onChange(updated);
  }

  async function resume() {
    const updated = await apiFetch<StudySession>(`/api/study-sessions/${session.id}/resume`, {
      method: "POST",
    });
    onChange(updated);
  }

  async function end() {
    const updated = await apiFetch<StudySession>(`/api/study-sessions/${session.id}/end`, {
      method: "POST",
    });
    onChange(updated);
    onEnded();
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 py-16 text-center">
      <p className="fn-eyebrow">{session.status === "running" ? "Focusing" : "Paused"}</p>

      <div className="relative flex items-center justify-center">
        <CircularProgress progress={elapsed / plannedSeconds} />
        <div className="absolute flex flex-col items-center">
          <span className="fn-mono text-4xl font-semibold">{formatElapsed(elapsed)}</span>
          <span className="fn-mono text-xs text-[var(--fn-muted)]">
            {formatElapsed(remainingSeconds)} remaining of {session.planned_minutes}m
          </span>
        </div>
      </div>

      <div className="flex gap-2">
        {session.status === "running" ? (
          <button
            type="button"
            onClick={pause}
            className="rounded-md border border-[var(--fn-rule)] px-4 py-2 text-sm hover:bg-[var(--fn-paper)]"
          >
            Pause
          </button>
        ) : (
          <button
            type="button"
            onClick={resume}
            className="rounded-md border border-[var(--fn-rule)] px-4 py-2 text-sm hover:bg-[var(--fn-paper)]"
          >
            Resume
          </button>
        )}
        <button type="button" onClick={end} className="fn-btn-primary !w-fit px-4">
          End session
        </button>
      </div>

      <button
        type="button"
        onClick={onStuck}
        className="text-sm text-[var(--fn-muted)] underline underline-offset-2"
      >
        {stuck ? "Blocker noted — logged at end" : "I am stuck"}
      </button>
    </main>
  );
}

function ReflectionForm({
  session,
  stuck,
  onDone,
}: {
  session: StudySession;
  stuck: boolean;
  onDone: () => void;
}) {
  const [outcome, setOutcome] = useState<StudySessionOutcome>(stuck ? "blocked" : "completed");
  const [notes, setNotes] = useState("");
  const [blocker, setBlocker] = useState("");
  const [remaining, setRemaining] = useState("");
  const [completion, setCompletion] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await apiFetch(`/api/study-sessions/${session.id}/reflect`, {
        method: "POST",
        body: JSON.stringify({
          outcome,
          notes: notes || null,
          blocker: blocker || null,
          remaining_estimate_minutes: remaining === "" ? null : Number(remaining),
          completion_percent: completion === "" ? null : Number(completion),
        }),
      });
      onDone();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="fn-sheet min-h-dvh w-full px-8 py-10 md:px-12">
      <p className="fn-eyebrow">Session ended</p>
      <h1 className="mt-1 text-2xl font-semibold">
        {session.actual_minutes ?? 0} minutes logged
      </h1>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="fn-label">Outcome</span>
          <select
            value={outcome}
            onChange={(event) => setOutcome(event.target.value as StudySessionOutcome)}
            className="fn-input"
          >
            {OUTCOMES.map((option) => (
              <option key={option} value={option}>
                {option.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </label>

        {outcome === "blocked" && (
          <label className="flex flex-col gap-1.5">
            <span className="fn-label">Blocker</span>
            <textarea
              value={blocker}
              onChange={(event) => setBlocker(event.target.value)}
              required
              className="fn-input"
            />
          </label>
        )}

        <label className="flex flex-col gap-1.5">
          <span className="fn-label">Remaining effort (minutes)</span>
          <input
            type="number"
            min={0}
            value={remaining}
            onChange={(event) => setRemaining(event.target.value)}
            className="fn-input"
            placeholder="Leave blank to keep as-is"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="fn-label">Completion %</span>
          <input
            type="number"
            min={0}
            max={100}
            value={completion}
            onChange={(event) => setCompletion(event.target.value)}
            className="fn-input"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="fn-label">Notes</span>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className="fn-input"
          />
        </label>

        <button type="submit" disabled={submitting} className="fn-btn-primary !w-fit px-4">
          {submitting ? "Saving…" : "Save reflection"}
        </button>
      </form>
    </main>
  );
}
