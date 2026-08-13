"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import type { WeeklyReview } from "@/lib/types";
import { WEEK_STATE_LABEL, WeekStateMarker } from "@/components/WeekState";
import { formatMinutes } from "@/lib/format";

const DISMISSED_KEY = "semestra:review-dismissed-id";

const CAUSE_LABEL: Record<string, string> = {
  partial: "Partially done",
  blocked: "Blocked",
  longer_than_estimated: "Took longer than estimated",
  easier_than_estimated: "Easier than estimated",
};

function weekRangeLabel(weekStartDate: string): string {
  const start = new Date(`${weekStartDate.slice(0, 10)}T00:00:00`);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const fmt = (d: Date) => d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
  return `${fmt(start)} – ${fmt(end)}`;
}

// "Weekly review" — see mdfile/semester-command-center.md. A deliberate
// full-screen moment, not a dashboard widget: two big numbers, why the
// gap happened, and whether next week is already shaping up overloaded.
export default function ReviewPage() {
  const router = useRouter();
  const [review, setReview] = useState<WeeklyReview | null | undefined>(undefined);
  const [replanning, setReplanning] = useState(false);

  useEffect(() => {
    apiFetch<WeeklyReview | null>("/api/weekly-reviews/latest").then(setReview);
  }, []);

  if (review === undefined) return null;

  if (review === null) {
    return (
      <main className="fn-sheet flex min-h-dvh w-full flex-col items-center justify-center gap-2 px-8 py-10 text-center">
        <p className="fn-eyebrow">Weekly review</p>
        <h1 className="text-xl font-semibold">No review yet</h1>
        <p className="max-w-sm text-sm text-[var(--fn-muted)]">
          Your first weekly review appears after your first full week of study sessions.
        </p>
      </main>
    );
  }

  const variance = review.completed_minutes - review.planned_minutes;
  const causes = Object.entries(review.cause_breakdown ?? {});

  function dismiss() {
    window.localStorage.setItem(DISMISSED_KEY, String(review!.id));
    router.push("/dashboard");
  }

  async function replan() {
    setReplanning(true);
    try {
      await apiFetch("/api/planning/run", { method: "POST" });
      window.localStorage.setItem(DISMISSED_KEY, String(review!.id));
      router.push("/calendar");
    } finally {
      setReplanning(false);
    }
  }

  return (
    <main className="fn-sheet min-h-dvh w-full px-8 py-10 md:px-12">
      <div className="mx-auto max-w-2xl">
        <p className="fn-eyebrow">Week of {weekRangeLabel(review.week_start_date)}</p>
        <h1 className="mt-1 text-2xl font-semibold">Your weekly review</h1>

        <div className="mt-8 grid grid-cols-2 gap-6">
          <div className="fn-sheet rounded-lg border border-[var(--fn-rule)] p-6">
            <p className="fn-eyebrow text-[var(--fn-muted)]">Planned</p>
            <p className="fn-mono mt-1 text-4xl font-semibold">{formatMinutes(review.planned_minutes)}</p>
          </div>
          <div className="fn-sheet rounded-lg border border-[var(--fn-rule)] p-6">
            <p className="fn-eyebrow text-[var(--fn-muted)]">Completed</p>
            <p className="fn-mono mt-1 text-4xl font-semibold">{formatMinutes(review.completed_minutes)}</p>
          </div>
        </div>

        <p className="mt-4 text-sm text-[var(--fn-muted)]">
          {variance >= 0
            ? `You completed ${formatMinutes(variance)} more than planned.`
            : `You fell ${formatMinutes(Math.abs(variance))} short of what was planned.`}
        </p>

        {causes.length > 0 && (
          <div className="mt-8">
            <p className="fn-eyebrow text-[var(--fn-muted)]">Why the gap</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {causes.map(([cause, count]) => (
                <span
                  key={cause}
                  className="fn-mono rounded border border-[var(--fn-rule)] px-2 py-1 text-[11px] text-[var(--fn-ink)]"
                >
                  {CAUSE_LABEL[cause] ?? cause} × {count}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8 flex items-center gap-3 rounded-lg border border-[var(--fn-rule)] p-4">
          <span className="fn-eyebrow text-[var(--fn-muted)]">Next week</span>
          {review.next_week_risk === "comfortable" ? (
            <span className="text-sm text-[var(--fn-muted)]">Looking comfortable so far.</span>
          ) : (
            <>
              <WeekStateMarker state={review.next_week_risk} />
              <span className="text-sm text-[var(--fn-muted)]">
                {WEEK_STATE_LABEL[review.next_week_risk]} — already shaping up heavier than usual.
              </span>
            </>
          )}
        </div>

        <div className="mt-8 flex gap-3">
          <button type="button" onClick={replan} disabled={replanning} className="fn-btn-primary">
            {replanning ? "Replanning…" : "Replan next week"}
          </button>
          <button
            type="button"
            onClick={dismiss}
            className="rounded-md border border-[var(--fn-rule)] px-4 py-2 text-sm text-[var(--fn-muted)]"
          >
            Review later
          </button>
        </div>
      </div>
    </main>
  );
}
