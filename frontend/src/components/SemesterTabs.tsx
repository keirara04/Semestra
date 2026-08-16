"use client";

import type { Semester } from "@/lib/types";

/**
 * Switches which semester a page is showing. Hidden entirely when there's
 * only one semester (or none) to pick from — a control with a single
 * option is noise, not navigation. `includeAll` adds a leading tab whose
 * id is `null`, for pages (like /courses) where "every semester" is a
 * meaningful view, not just a fallback.
 */
export function SemesterTabs({
  semesters,
  activeId,
  onChange,
  includeAll = false,
}: {
  semesters: Semester[];
  activeId: number | null;
  onChange: (id: number | null) => void;
  includeAll?: boolean;
}) {
  if (semesters.length <= 1 && !includeAll) return null;

  return (
    <div role="tablist" aria-label="Semester" className="fn-view-toggle flex-wrap">
      {includeAll && (
        <TabButton label="All" active={activeId === null} onClick={() => onChange(null)} />
      )}
      {semesters.map((semester) => (
        <TabButton
          key={semester.id}
          label={semester.name}
          active={activeId === semester.id}
          onClick={() => onChange(semester.id)}
        />
      ))}
    </div>
  );
}

function TabButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`fn-view-toggle-btn ${active ? "fn-view-toggle-btn--active" : ""}`}
    >
      {label}
    </button>
  );
}
