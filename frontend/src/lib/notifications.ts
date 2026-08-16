"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { qk } from "@/lib/query-keys";

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
  const queryClient = useQueryClient();

  const { data: notifications = [] } = useQuery({
    queryKey: qk.notifications.all,
    queryFn: () => apiFetch<Notification[]>("/api/notifications"),
    // Own refetchInterval rather than relying on the global staleTime:
    // notifications are the one thing in the app worth polling for
    // freshness even while the tab sits idle on one page.
    refetchInterval: POLL_MS,
    staleTime: POLL_MS,
  });

  async function markRead(id: number) {
    queryClient.setQueryData(qk.notifications.all, (current: Notification[] | undefined) =>
      (current ?? []).map((n) => (n.id === id ? { ...n, read_at: n.read_at ?? new Date().toISOString() } : n)),
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
