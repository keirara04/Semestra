"use client";

import { useId } from "react";

// Ported from src/app/(app)/semester/asset/{assessment-marker,risk-window}.svg
// — see SEMESTER_MAP_SVG_KIT.md. Both use `currentColor`, so set `color`
// on a wrapper (or pass `className`) to recolor per course.

export function AssessmentMarker({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} role="img" aria-hidden="true">
      <circle cx="24" cy="24" r="10" fill="currentColor" stroke="var(--fn-paper)" strokeWidth="3" />
    </svg>
  );
}

/** Diagonally hatched at-risk marker — replaces AssessmentMarker when the assessment falls in an at-risk/critical week. */
export function RiskWindow({ className }: { className?: string }) {
  const patternId = useId();
  return (
    <svg viewBox="0 0 128 40" fill="none" className={className} role="img" aria-hidden="true">
      <defs>
        <pattern id={patternId} width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <path d="M0 0V8" stroke="currentColor" strokeWidth="2" />
        </pattern>
      </defs>
      <rect x="2" y="5" width="124" height="30" rx="2" fill={`url(#${patternId})`} stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

// course-lane.svg's start dot + solid/dashed segments, reimplemented with
// CSS so the lane can stretch to any width (the source SVG's viewBox is
// fixed at 900x70 for a static demo). Same visual language: solid line up
// to `splitPercent`, dashed after, small filled dot at the start.
export function CourseLaneLine({ color, splitPercent }: { color: string; splitPercent: number }) {
  const clamped = Math.min(100, Math.max(0, splitPercent));
  return (
    <div className="relative h-[3px] w-full" style={{ color }}>
      <span
        className="absolute top-1/2 left-0 h-2.5 w-2.5 -translate-y-1/2 rounded-full"
        style={{ backgroundColor: color, boxShadow: "0 0 0 2px var(--fn-paper)" }}
      />
      {clamped > 0 && (
        <div
          className="absolute top-0 left-0 h-[3px] rounded-full"
          style={{ width: `${clamped}%`, backgroundColor: color }}
        />
      )}
      {clamped < 100 && (
        <div
          className="absolute top-[1px] h-0 border-t-2 border-dashed"
          style={{ left: `${clamped}%`, right: 0, borderColor: color }}
        />
      )}
    </div>
  );
}
