// Week-state system, see "Week-state system" in mdfile/DESIGN.md. Shared
// by Today's workload verdict and the Calendar view's per-day readout so
// there's one encoding, not two.
export type WeekState = "comfortable" | "busy" | "at_risk" | "critical";

export function weekState(plannedMinutes: number, capacityMinutes: number): WeekState {
  if (plannedMinutes <= 0) return "comfortable";
  const ratio = capacityMinutes <= 0 ? Infinity : plannedMinutes / capacityMinutes;
  if (ratio <= 0.7) return "comfortable";
  if (ratio <= 1.0) return "busy";
  if (ratio <= 1.3) return "at_risk";
  return "critical";
}

export const WEEK_STATE_LABEL: Record<WeekState, string> = {
  comfortable: "Comfortable",
  busy: "Busy",
  at_risk: "At risk",
  critical: "Critical",
};

// Compact version of WeekStateMarker for tight spaces (week-axis columns):
// same non-colour encoding, no label text, exposed via `title` instead.
export function WeekStateDot({ state }: { state: WeekState }) {
  if (state === "comfortable") {
    return null;
  }

  const styles: Record<Exclude<WeekState, "comfortable">, string> = {
    busy: "rounded-full bg-[var(--fn-ochre)]",
    at_risk: "rounded-full border border-dashed border-[var(--fn-oxide)]",
    critical: "rounded-full border border-[var(--fn-oxide)] bg-[var(--fn-oxide)]",
  };

  return (
    <span
      role="img"
      aria-label={WEEK_STATE_LABEL[state]}
      title={WEEK_STATE_LABEL[state]}
      className={`absolute top-1 right-1 h-1.5 w-1.5 ${styles[state]}`}
    />
  );
}

// Non-colour encoding pairs with colour so risk is never colour-only.
export function WeekStateMarker({ state }: { state: WeekState }) {
  if (state === "comfortable") {
    return null;
  }

  const styles: Record<Exclude<WeekState, "comfortable">, string> = {
    busy: "border border-[var(--fn-rule)] bg-[var(--fn-ochre)]/15 text-[var(--fn-ochre)]",
    at_risk: "border border-dashed border-[var(--fn-oxide)] text-[var(--fn-oxide)]",
    critical:
      "border border-[var(--fn-oxide)] bg-[var(--fn-oxide)]/15 font-semibold text-[var(--fn-oxide)]",
  };

  return (
    <span className={`fn-mono rounded px-1.5 py-0.5 text-[11px] tracking-wide ${styles[state]}`}>
      {WEEK_STATE_LABEL[state].toUpperCase()}
    </span>
  );
}
