"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  CalendarDays,
  ChevronsLeft,
  ChevronsRight,
  CircleDot,
  GraduationCap,
  LayoutGrid,
  ListChecks,
  LogOut,
  Menu,
  Settings,
  Sparkles,
  Sun,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";

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

// Shared so the dark rail and the light mobile sheet render an identical
// ring — see "Keep keyboard focus clearly visible on the dark rail and
// the paper sheet" in mdfile/DESIGN.md.
const FOCUS_RING = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--fn-cobalt)] focus-visible:outline-offset-2";

const RAIL_COLLAPSED_KEY = "semestra:rail-collapsed";

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(RAIL_COLLAPSED_KEY) === "1";
  });

  function toggleCollapsed() {
    setCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem(RAIL_COLLAPSED_KEY, next ? "1" : "0");
      return next;
    });
  }

  useEffect(() => {
    if (!moreOpen) return;

    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMoreOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [moreOpen]);

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  return (
    <div className="fn flex w-full min-h-dvh">
      {/* Desktop rail — see "Desktop composition" in DESIGN.md. Fixed to
          the viewport height with its own scroll for the nav groups, so a
          short viewport with many items never pushes Settings/logout
          below the fold — they stay pinned and reachable without paging
          the whole app. */}
      <nav
        aria-label="Primary"
        className={cn(
          "sticky top-0 hidden h-dvh shrink-0 flex-col justify-between bg-[var(--fn-sidebar)] py-6 text-[#e7e9ec] transition-[width] duration-150 md:flex",
          collapsed ? "w-16 px-2" : "w-60 px-3",
        )}
      >
        <div className="min-h-0 overflow-y-auto overflow-x-hidden">
          <div
            className={cn(
              "flex items-center gap-2 pb-6",
              collapsed ? "justify-center px-0" : "justify-between px-3",
            )}
          >
            {!collapsed && <span className="fn-eyebrow text-[#c9cdd3]">Semestra</span>}
            <button
              type="button"
              onClick={toggleCollapsed}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              className={cn("rounded p-1 text-[#aeb3ba] hover:text-white", FOCUS_RING)}
            >
              {collapsed ? (
                <ChevronsRight className="h-4 w-4" />
              ) : (
                <ChevronsLeft className="h-4 w-4" />
              )}
            </button>
          </div>
          <div className="flex flex-col gap-5">
            {RAIL_GROUPS.map((group, index) => (
              <div key={index} className="flex flex-col gap-0.5">
                {group.map((item) => (
                  <RailLink
                    key={item.href}
                    item={item}
                    active={isActive(pathname, item.href)}
                    collapsed={collapsed}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className="flex shrink-0 flex-col gap-2 border-t border-white/10 pt-3">
          <RailLink
            item={SETTINGS_ITEM}
            active={isActive(pathname, SETTINGS_ITEM.href)}
            collapsed={collapsed}
          />
          {user && (
            <div className={cn("pt-2", collapsed ? "flex flex-col items-center" : "px-3")}>
              {!collapsed && <p className="truncate text-xs text-[#c9cdd3]">{user.name}</p>}
              <button
                type="button"
                onClick={handleLogout}
                title="Log out"
                className={cn(
                  "mt-1 flex items-center gap-2 rounded-md py-1 text-sm text-[#aeb3ba] hover:text-white",
                  collapsed && "justify-center",
                  FOCUS_RING,
                )}
              >
                <LogOut className="h-4 w-4" />
                {!collapsed && "Log out"}
              </button>
            </div>
          )}
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
            className={cn(
              "flex min-w-11 flex-col items-center gap-0.5 px-2 py-1 text-[var(--fn-muted)]",
              FOCUS_RING,
            )}
          >
            <Menu className="h-5 w-5" />
            <span className="text-[11px]">More</span>
          </button>
        </nav>
      </div>

      {moreOpen && (
        <div className="fixed inset-0 z-30 md:hidden" role="dialog" aria-modal="true" aria-label="More navigation">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setMoreOpen(false)}
            className="absolute inset-0 bg-black/30"
          />
          <div className="fn-sheet absolute inset-x-0 bottom-0 rounded-t-2xl border-t border-[var(--fn-rule)] p-4 pb-8">
            <div className="mb-3 flex items-center justify-between">
              <span className="fn-eyebrow">More</span>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                aria-label="Close"
                className={cn("rounded", FOCUS_RING)}
              >
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
                    FOCUS_RING,
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </Link>
              ))}
            </div>
            {user && (
              <div className="mt-3 border-t border-[var(--fn-rule)] pt-3">
                <p className="truncate px-3 text-xs text-[var(--fn-muted)]">{user.name}</p>
                <button
                  type="button"
                  onClick={() => {
                    setMoreOpen(false);
                    handleLogout();
                  }}
                  className={cn(
                    "mt-1 flex items-center gap-2 rounded-md px-3 py-2 text-sm text-[var(--fn-oxide)]",
                    FOCUS_RING,
                  )}
                >
                  <LogOut className="h-4 w-4" />
                  Log out
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function RailLink({
  item,
  active,
  collapsed,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
}) {
  return (
    <Link
      href={item.href}
      title={collapsed ? item.label : undefined}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
        collapsed && "justify-center px-0",
        active
          ? "bg-white/10 font-medium text-white"
          : "text-[#aeb3ba] hover:bg-white/5 hover:text-white",
        FOCUS_RING,
      )}
    >
      <item.icon className="h-4 w-4 shrink-0" />
      {!collapsed && item.label}
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
        FOCUS_RING,
      )}
    >
      <item.icon className="h-5 w-5" />
      <span className="text-[11px]">{item.label}</span>
    </Link>
  );
}
