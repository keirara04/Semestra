"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

export interface Notification {
  id: number;
  type: string;
  message: string;
  status: string;
  read_at: string | null;
  created_at: string;
}

const POLL_MS = 60_000;

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await apiFetch<Notification[]>("/api/notifications");
        if (!cancelled) setNotifications(data);
      } catch {
        // Silent — notifications are informational, not worth surfacing a fetch error.
      }
    }

    load();
    const interval = setInterval(load, POLL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  async function markRead(id: number) {
    setNotifications((current) =>
      current.map((n) => (n.id === id ? { ...n, read_at: n.read_at ?? new Date().toISOString() } : n)),
    );
    try {
      await apiFetch(`/api/notifications/${id}/read`, { method: "POST" });
    } catch {
      // Best-effort — next poll reconciles state either way.
    }
  }

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  return { notifications, unreadCount, markRead };
}
