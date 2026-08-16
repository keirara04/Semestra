"use client";

import { useEffect, useState } from "react";

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

// One tile per character. `key` is the value itself (not the position),
// so React remounts the tile whenever its digit changes — the CSS
// animation below only replays on an actual flip, not every tick.
function FlipTile({ char }: { char: string }) {
  return (
    <span
      key={char}
      className="fn-mono motion-safe:animate-[fn-flip_0.3s_ease-out] relative flex h-6 w-4 items-center justify-center overflow-hidden rounded-[3px] bg-[#1a1a1a] text-[12px] font-bold text-[#e7e9ec] shadow-[0_1px_2px_rgba(0,0,0,0.25)]"
    >
      {char}
      {/* The split-flap seam: a hairline shadow across the tile's
          midpoint, the one detail that reads as "flip clock" rather
          than just "dark rounded badge." */}
      <span className="pointer-events-none absolute inset-x-0 top-1/2 h-px bg-black/70" aria-hidden />
      <span
        className="pointer-events-none absolute inset-0 rounded-[3px]"
        style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)" }}
        aria-hidden
      />
    </span>
  );
}

/**
 * Split-flap departure-board clock for the rail header — a physical-object
 * accent (see the crest badge / ledger-paper motifs elsewhere in the app)
 * rather than a generic digital readout. Tiles stay black regardless of
 * theme, same as a real flip clock's mechanism.
 */
export function FlipClock({ compact = false }: { compact?: boolean }) {
  const now = useNow();
  const hours24 = now.getHours();
  const hours = hours24 % 12 || 12;
  const minutes = pad(now.getMinutes());
  const period = hours24 >= 12 ? "PM" : "AM";
  const hourStr = pad(hours);

  if (compact) {
    return (
      <span className="fn-mono block text-center text-[9px] tracking-wider text-[var(--fn-muted)]">
        {hourStr}:{minutes}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-1" aria-label={`${hourStr}:${minutes} ${period}`}>
      {hourStr.split("").map((c, i) => (
        <FlipTile key={`h${i}`} char={c} />
      ))}
      <span className="text-xs font-bold text-[var(--fn-muted)]">:</span>
      {minutes.split("").map((c, i) => (
        <FlipTile key={`m${i}`} char={c} />
      ))}
      <span className="fn-mono ml-1 text-[9px] font-semibold tracking-wide text-[var(--fn-muted)]">{period}</span>
    </div>
  );
}
