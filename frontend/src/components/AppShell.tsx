"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  CalendarDays,
  ChevronsLeft,
  ChevronsRight,
  CircleDot,
  FileText,
  GraduationCap,
  Home,
  LayoutGrid,
  LogOut,
  Menu,
  Settings,
  TrendingUp,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";

interface NavItem {
  href: string;
  label: string;
  icon: typeof Home;
}

// Primary navigation, see "Primary navigation" in mdfile/DESIGN.md. Originally
// eight fixed destinations; Notestra (mdfile/NOTESTRA_FUNCTIONAL_SPEC.md) is a
// deliberate ninth addition, added on request rather than through that doc.
const NOTESTRA_ITEM: NavItem = { href: "/notestra", label: "Notestra", icon: FileText };

// One line-icon library (lucide), one stroke weight, no filled/glow/sparkle
// icons — see RailLink/BottomLink, which both pass the same strokeWidth
// explicitly rather than relying on each icon's own default.
const RAIL_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Overview",
    items: [
      { href: "/dashboard", label: "Today", icon: Home },
      { href: "/semester", label: "Semester", icon: CalendarDays },
      { href: "/calendar", label: "Calendar", icon: LayoutGrid },
    ],
  },
  {
    label: "Academics",
    items: [{ href: "/courses", label: "Courses", icon: GraduationCap }, NOTESTRA_ITEM],
  },
  {
    label: "Focus",
    items: [
      { href: "/focus", label: "Focus", icon: CircleDot },
      { href: "/insights", label: "Insights", icon: TrendingUp },
    ],
  },
];

const SETTINGS_ITEM: NavItem = { href: "/settings", label: "Settings", icon: Settings };

const BOTTOM_NAV: NavItem[] = [
  { href: "/dashboard", label: "Today", icon: Home },
  { href: "/calendar", label: "Calendar", icon: LayoutGrid },
  { href: "/focus", label: "Focus", icon: CircleDot },
  { href: "/courses", label: "Courses", icon: GraduationCap },
];

const MORE_ITEMS: NavItem[] = [
  { href: "/semester", label: "Semester", icon: CalendarDays },
  { href: "/insights", label: "Insights", icon: TrendingUp },
  NOTESTRA_ITEM,
  SETTINGS_ITEM,
];

// Shared so the desktop rail and the mobile sheet render an identical
// focus ring, see "Keep keyboard focus clearly visible" in mdfile/DESIGN.md.
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
      {/* Desktop rail, see "Desktop composition" in DESIGN.md. Fixed to
          the viewport height with its own scroll for the nav groups, so a
          short viewport with many items never pushes Settings/logout
          below the fold: they stay pinned and reachable without paging
          the whole app. */}
      <nav
        aria-label="Primary"
        className={cn(
          "sticky top-0 hidden h-dvh shrink-0 flex-col justify-between border-r border-[var(--fn-rule)] bg-[var(--fn-sidebar)] py-7 text-[var(--fn-ink)] transition-[width] duration-200 ease-out md:flex",
          collapsed ? "w-16" : "w-64",
        )}
      >
        {/* Collapse/expand: a pull-tab straddling the rail's own border,
            vertically centered — a tall pill (not a circle) so it reads
            as a physical grip on the border rather than a disc with a
            hairline poking through it, Notion/VSCode/Linear pattern
            rather than competing with the logo for header space. */}
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(
            "absolute top-1/2 -right-2.5 z-10 flex h-9 w-5 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--fn-rule)] bg-[var(--fn-paper)] text-[var(--fn-muted)] shadow-md transition-colors duration-150 hover:border-[var(--fn-cobalt)] hover:text-[var(--fn-cobalt)]",
            FOCUS_RING,
          )}
        >
          {collapsed ? <ChevronsRight className="h-3 w-3" /> : <ChevronsLeft className="h-3 w-3" />}
        </button>

        <div className="min-h-0 overflow-y-auto overflow-x-hidden">
          <div
            className={cn(
              "flex items-center gap-2 border-b border-[var(--fn-rule)] pb-6",
              collapsed ? "flex-col justify-center px-0" : "px-3",
            )}
          >
            <div className="flex min-w-0 items-center gap-2.5">
              {/* Plain mono badge + tracked eyebrow-style wordmark — same
                  IBM Plex Mono/DM Sans system the rest of the rail (and
                  app) already uses, not a one-off serif accent. */}
              <span
                className="fn-mono flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-[var(--fn-cobalt)] text-sm font-bold text-[var(--fn-cobalt)]"
                aria-hidden
              >
                S
              </span>
              <span
                className={cn(
                  "fn-mono overflow-hidden whitespace-nowrap text-sm font-semibold tracking-[0.08em] text-[var(--fn-ink)] uppercase transition-all duration-200 ease-out",
                  collapsed ? "max-w-0 opacity-0" : "max-w-32 opacity-100",
                )}
              >
                Semestra
              </span>
            </div>
          </div>
          <div className="mt-6 flex flex-col gap-6">
            {RAIL_GROUPS.map((group) => (
              <div key={group.label} className="flex flex-col gap-0.5">
                {!collapsed && (
                  <p className="fn-mono px-3 pb-2 text-[9px] font-semibold tracking-[0.2em] text-[var(--fn-muted)] uppercase opacity-70">
                    {group.label}
                  </p>
                )}
                {group.items.map((item) => (
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
        <div className="flex shrink-0 flex-col gap-3 border-t border-[var(--fn-ink)]/[0.08] pt-4">
          <RailLink
            item={SETTINGS_ITEM}
            active={isActive(pathname, SETTINGS_ITEM.href)}
            collapsed={collapsed}
          />
          {user && (
            <div
              className={cn(
                "flex items-center gap-2.5 border-t border-[var(--fn-rule)] pt-3",
                collapsed ? "flex-col px-0" : "px-3",
              )}
            >
              <span
                className="fn-mono flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--fn-paper)] text-[11px] font-semibold text-[var(--fn-ink)]"
                aria-hidden
              >
                {user.name.charAt(0).toUpperCase()}
              </span>
              {!collapsed && (
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-[var(--fn-ink)]">{user.name}</p>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className={cn(
                      "fn-mono flex items-center gap-1 text-[11px] text-[var(--fn-muted)] hover:text-[var(--fn-oxide)]",
                      FOCUS_RING,
                    )}
                  >
                    <LogOut className="h-3 w-3" />
                    Log out
                  </button>
                </div>
              )}
              {collapsed && (
                <button
                  type="button"
                  onClick={handleLogout}
                  title="Log out"
                  className={cn("text-[var(--fn-muted)] hover:text-[var(--fn-oxide)]", FOCUS_RING)}
                >
                  <LogOut className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
        </div>
      </nav>

      <div className="flex min-w-0 flex-1 flex-col">
        <main className="flex-1 pb-20 md:pb-0">{children}</main>

        {/* Mobile bottom nav, see "Mobile behaviour" in DESIGN.md. */}
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
            className="motion-safe:animate-in motion-safe:fade-in absolute inset-0 bg-black/30 duration-200"
          />
          <div className="fn-sheet motion-safe:animate-in motion-safe:slide-in-from-bottom-4 motion-safe:fade-in absolute inset-x-0 bottom-0 rounded-t-2xl border-t border-[var(--fn-rule)] p-4 pb-8 duration-200 ease-out">
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
                    "flex items-center gap-3 rounded-r-md rounded-l-sm border-l-2 py-2.5 pr-3 pl-2.5 text-sm",
                    isActive(pathname, item.href)
                      ? "border-[var(--fn-cobalt)] bg-[var(--fn-canvas)] font-medium text-[var(--fn-ink)]"
                      : "border-transparent text-[var(--fn-muted)]",
                    FOCUS_RING,
                  )}
                >
                  <item.icon className="h-5 w-5" strokeWidth={1.75} />
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
        // No rounded corners: the active border sits flush against the
        // sidebar's true edge (not a rounded chip/box), and the hover
        // fill stays the same flush rectangle rather than an
        // asymmetric half-rounded shape — see point 1 of the appshell
        // design pass.
        "group flex items-center gap-3 border-l-2 py-2 pr-3 pl-3 text-[13px] transition-colors duration-150 ease-out",
        collapsed && "justify-center border-l-0 px-0",
        active
          ? "border-[var(--fn-cobalt)] font-semibold text-[var(--fn-ink)]"
          : "border-transparent text-[var(--fn-muted)] hover:bg-[var(--fn-paper)] hover:text-[var(--fn-ink)]",
        FOCUS_RING,
      )}
    >
      <item.icon
        className="h-[18px] w-[18px] shrink-0"
        strokeWidth={1.75}
        style={active ? { color: "var(--fn-cobalt)" } : undefined}
      />
      <span
        className={cn(
          "overflow-hidden whitespace-nowrap transition-all duration-200 ease-out",
          collapsed ? "max-w-0 opacity-0" : "max-w-40 opacity-100",
        )}
      >
        {item.label}
      </span>
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
      <item.icon className="h-5 w-5" strokeWidth={1.75} />
      <span className="text-[11px]">{item.label}</span>
    </Link>
  );
}
