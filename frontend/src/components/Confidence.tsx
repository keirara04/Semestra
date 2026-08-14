// Topic confidence, see "Materials, notes, and revision" and "Exam mode"
// in mdfile/DESIGN.md: same bar-plus-label vocabulary reused everywhere
// confidence appears (Revision tab now, Exam mode's coverage checklist
// later): one visual system, not reinvented per screen.
export type Confidence = "not_started" | "learning" | "comfortable" | "confident";

export const CONFIDENCE_LABEL: Record<Confidence, string> = {
  not_started: "Not started",
  learning: "Learning",
  comfortable: "Comfortable",
  confident: "Confident",
};

const CONFIDENCE_FRACTION: Record<Confidence, number> = {
  not_started: 0,
  learning: 1 / 3,
  comfortable: 2 / 3,
  confident: 1,
};

export function ConfidenceBar({ confidence }: { confidence: Confidence }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-[var(--fn-canvas)]">
        <div
          className="h-full rounded-full bg-[var(--fn-cobalt)]"
          style={{ width: `${CONFIDENCE_FRACTION[confidence] * 100}%` }}
        />
      </div>
      <span className="fn-mono text-[11px] text-[var(--fn-muted)]">
        {CONFIDENCE_LABEL[confidence]}
      </span>
    </div>
  );
}
