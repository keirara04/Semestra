"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/lib/notifications";

const FOCUS_RING = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--fn-cobalt)] focus-visible:outline-offset-2";

const PANEL_WIDTH = 320;

export function NotificationBell() {
  const { notifications, unreadCount, markRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) {
      const left = Math.min(rect.left, window.innerWidth - PANEL_WIDTH - 8);
      setPosition({ top: rect.bottom + 8, left: Math.max(8, left) });
    }

    function onClick(event: MouseEvent) {
      const target = event.target as Node;
      if (
        buttonRef.current &&
        !buttonRef.current.contains(target) &&
        panelRef.current &&
        !panelRef.current.contains(target)
      ) {
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
    <>
      <button
        ref={buttonRef}
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

      {open &&
        position &&
        createPortal(
          <div
            ref={panelRef}
            role="dialog"
            aria-label="Notifications"
            style={{ top: position.top, left: position.left, width: PANEL_WIDTH }}
            className="fn-sheet fixed z-50 max-h-96 overflow-y-auto rounded-md border border-[var(--fn-rule)] p-2 shadow-lg"
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
                        notification.read_at
                          ? "text-[var(--fn-muted)]"
                          : "bg-[var(--fn-canvas)] text-[var(--fn-ink)]",
                        FOCUS_RING,
                      )}
                    >
                      {notification.message}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>,
          document.body,
        )}
    </>
  );
}
