"use client";

import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/lib/notifications";

const FOCUS_RING = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--fn-cobalt)] focus-visible:outline-offset-2";

export function NotificationBell({ collapsed }: { collapsed: boolean }) {
  const { notifications, unreadCount, markRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onClick(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : "Notifications"}
        title="Notifications"
        className={cn("relative rounded p-1 text-[#aeb3ba] hover:text-white", FOCUS_RING)}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-[var(--fn-ochre)]" />
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          className={cn(
            "fn-sheet absolute z-40 max-h-96 w-80 overflow-y-auto rounded-md border border-[var(--fn-rule)] p-2 shadow-lg",
            collapsed ? "left-14 top-0" : "left-0 top-full mt-2",
          )}
        >
          {notifications.length === 0 ? (
            <p className="p-3 text-sm text-[var(--fn-muted)]">No notifications yet.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {notifications.map((notification) => (
                <li key={notification.id}>
                  <button
                    type="button"
                    onClick={() => markRead(notification.id)}
                    className={cn(
                      "w-full rounded-md px-3 py-2 text-left text-sm",
                      notification.read_at ? "text-[var(--fn-muted)]" : "bg-[var(--fn-canvas)] text-[var(--fn-ink)]",
                      FOCUS_RING,
                    )}
                  >
                    {notification.message}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
