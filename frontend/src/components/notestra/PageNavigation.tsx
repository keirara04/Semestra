"use client";

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, PanelRight } from "lucide-react";

interface PageNavigationProps {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  showNotes: boolean;
  onToggleNotes: () => void;
}

function NavButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--fn-ink)] hover:bg-[var(--fn-canvas)] disabled:opacity-30"
    >
      {children}
    </button>
  );
}

// Floating bottom pill, matching the reference design's page-nav bar —
// first/prev/page input/next/last, plus a panel toggle at the trailing
// edge (mapped to the notes panel here, in place of a "split view" toggle).
export function PageNavigation({ page, totalPages, onChange, showNotes, onToggleNotes }: PageNavigationProps) {
  return (
    <div
      className="flex items-center gap-1 rounded-2xl border bg-[var(--fn-paper)] px-2 py-1.5 shadow-lg"
      style={{ borderColor: "var(--fn-rule)" }}
    >
      <NavButton label="First page" disabled={page <= 1} onClick={() => onChange(1)}>
        <ChevronsLeft size={18} />
      </NavButton>
      <NavButton label="Previous page" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        <ChevronLeft size={18} />
      </NavButton>

      <input
        type="number"
        aria-label="Page number"
        className="fn-input h-9 w-14 text-center"
        min={1}
        max={totalPages}
        value={page}
        onChange={(event) => {
          const next = Number(event.target.value);
          if (next >= 1 && next <= totalPages) onChange(next);
        }}
      />
      <span className="fn-mono text-sm text-[var(--fn-muted)]">/ {totalPages}</span>

      <NavButton label="Next page" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
        <ChevronRight size={18} />
      </NavButton>
      <NavButton label="Last page" disabled={page >= totalPages} onClick={() => onChange(totalPages)}>
        <ChevronsRight size={18} />
      </NavButton>

      <div className="mx-1 h-6 w-px" style={{ background: "var(--fn-rule)" }} />

      <NavButton label="Toggle notes panel" onClick={onToggleNotes}>
        <PanelRight size={18} className={showNotes ? "text-[var(--fn-cobalt)]" : undefined} />
      </NavButton>
    </div>
  );
}
