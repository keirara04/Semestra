"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  CircleDot,
  GraduationCap,
  LayoutGrid,
  ListChecks,
  Menu,
  Settings,
  Sparkles,
  Sun,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: typeof Sun;
}

// Primary navigation — see "Primary navigation" in mdfile/DESIGN.md. Eight
// destinations; nothing in the interface should require a name that isn't
// one of these.
const RAIL_GROUPS: NavItem[][] = [
  [
    { href: "/dashboard", label: "Today", icon: Sun },
    { href: "/semester", label: "Semester", icon: CalendarDays },
    { href: "/calendar", label: "Calendar", icon: LayoutGrid },
  ],
  [
    { href: "/courses", label: "Courses", icon: GraduationCap },
    { href: "/assessments", label: "Assessments", icon: ListChecks },
  ],
  [
    { href: "/focus", label: "Focus", icon: CircleDot },
    { href: "/insights", label: "Insights", icon: Sparkles },
  ],
];

const SETTINGS_ITEM: NavItem = { href: "/settings", label: "Settings", icon: Settings };

const BOTTOM_NAV: NavItem[] = [
  { href: "/dashboard", label: "Today", icon: Sun },
  { href: "/calendar", label: "Calendar", icon: LayoutGrid },
  { href: "/focus", label: "Focus", icon: CircleDot },
  { href: "/courses", label: "Courses", icon: GraduationCap },
];

const MORE_ITEMS: NavItem[] = [
  { href: "/semester", label: "Semester", icon: CalendarDays },
  { href: "/assessments", label: "Assessments", icon: ListChecks },
  { href: "/insights", label: "Insights", icon: Sparkles },
  SETTINGS_ITEM,
];

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <div className="fn flex min-h-dvh">
      {/* Desktop rail — see "Desktop composition" in DESIGN.md. */}
      <nav
        aria-label="Primary"
        className="hidden w-60 shrink-0 flex-col justify-between bg-[var(--fn-sidebar)] px-3 py-6 text-[#e7e9ec] md:flex"
      >
        <div>
          <div className="fn-eyebrow px-3 pb-6 text-[#c9cdd3]">Semestra</div>
          <div className="flex flex-col gap-5">
            {RAIL_GROUPS.map((group, index) => (
              <div key={index} className="flex flex-col gap-0.5">
                {group.map((item) => (
                  <RailLink key={item.href} item={item} active={isActive(pathname, item.href)} />
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className="border-t border-white/10 pt-3">
          <RailLink item={SETTINGS_ITEM} active={isActive(pathname, SETTINGS_ITEM.href)} />
        </div>
      </nav>

      <div className="flex min-w-0 flex-1 flex-col">
        <main className="flex-1 pb-20 md:pb-0">{children}</main>

        {/* Mobile bottom nav — see "Mobile behaviour" in DESIGN.md. */}
        <nav
          aria-label="Primary"
          className="fixed inset-x-0 bottom-0 z-20 flex items-center justify-around border-t border-[var(--fn-rule)] bg-[var(--fn-paper)] py-1.5 md:hidden"
        >
          {BOTTOM_NAV.map((item) => (
            <BottomLink key={item.href} item={item} active={isActive(pathname, item.href)} />
          ))}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className="flex min-w-11 flex-col items-center gap-0.5 px-2 py-1 text-[var(--fn-muted)]"
          >
            <Menu className="h-5 w-5" />
            <span className="text-[11px]">More</span>
          </button>
        </nav>
      </div>

      {moreOpen && (
        <div className="fixed inset-0 z-30 md:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setMoreOpen(false)}
            className="absolute inset-0 bg-black/30"
          />
          <div className="fn-sheet absolute inset-x-0 bottom-0 rounded-t-2xl border-t border-[var(--fn-rule)] p-4 pb-8">
            <div className="mb-3 flex items-center justify-between">
              <span className="fn-eyebrow">More</span>
              <button type="button" onClick={() => setMoreOpen(false)} aria-label="Close">
                <X className="h-5 w-5 text-[var(--fn-muted)]" />
              </button>
            </div>
            <div className="flex flex-col gap-1">
              {MORE_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm",
                    isActive(pathname, item.href)
                      ? "bg-[var(--fn-canvas)] font-medium text-[var(--fn-ink)]"
                      : "text-[var(--fn-muted)]",
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RailLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
        active
          ? "bg-white/10 font-medium text-white"
          : "text-[#aeb3ba] hover:bg-white/5 hover:text-white",
      )}
    >
      <item.icon className="h-4 w-4" />
      {item.label}
    </Link>
  );
}

function BottomLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      className={cn(
        "flex min-w-11 flex-col items-center gap-0.5 px-2 py-1",
        active ? "text-[var(--fn-cobalt)]" : "text-[var(--fn-muted)]",
      )}
    >
      <item.icon className="h-5 w-5" />
      <span className="text-[11px]">{item.label}</span>
    </Link>
  );
}
