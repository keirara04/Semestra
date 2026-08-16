"use client";

import { useState } from "react";
import { CircleHelp } from "lucide-react";

// Small "what is this" disclosure — a ghost circle button (same sizing
// vocabulary as .fn-nav-arrow) that reveals a short explanation on click,
// for section labels whose meaning isn't self-evident from the name alone
// (e.g. "Deliverables" for a first-time student).
export function HelpTooltip({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-label={label}
        className="fn-nav-arrow h-5 w-5"
      >
        <CircleHelp size={14} strokeWidth={2} />
      </button>
      {open && (
        <>
          <button
            type="button"
            aria-label="Close"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default"
          />
          <div
            role="tooltip"
            className="fn-popup-card absolute left-0 top-6 z-50 w-64 rounded-md border border-[var(--fn-rule)] bg-[var(--fn-paper)] p-3 text-xs leading-relaxed text-[var(--fn-ink)] shadow-lg"
          >
            {children}
          </div>
        </>
      )}
    </span>
  );
}
